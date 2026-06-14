using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PsiAgenda.Application.Spaces;
using PsiAgenda.Domain.Entities;
using PsiAgenda.Domain.Enums;
using PsiAgenda.Infrastructure.Persistence;

namespace PsiAgenda.Infrastructure.Services;

public sealed class SpaceService(
    PsiAgendaDbContext dbContext,
    IOptions<BusinessClockOptions> businessClockOptions) : ISpaceService
{
    private const int DefaultSlotGranularityMinutes = 30;
    private const string DefaultPolicyText = "Cancelamentos gratuitos até 24h antes do atendimento.";
    private readonly TimeSpan fallbackBusinessTimeOffset = businessClockOptions.Value.GetFallbackUtcOffset();
    private readonly TimeZoneInfo? businessTimeZone = ResolveBusinessTimeZone(businessClockOptions.Value.TimeZoneId);

    public async Task<SpaceDto> CreateSpaceAsync(
        Guid ownerUserId,
        CreateSpaceRequest request,
        CancellationToken cancellationToken)
    {
        var owner = await dbContext.Users
            .FirstOrDefaultAsync(user => user.Id == ownerUserId && user.Active, cancellationToken);

        if (owner is null)
        {
            throw new UnauthorizedAccessException("Usuário autenticado não encontrado.");
        }

        ValidateSpace(request);

        var space = new Space
        {
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? "Espaço em configuração."
                : request.Description.Trim(),
            Category = request.Category.Trim(),
            Phone = request.Phone.Trim(),
            Whatsapp = string.IsNullOrWhiteSpace(request.Whatsapp)
                ? request.Phone.Trim()
                : request.Whatsapp.Trim(),
            Address = request.Address.Trim(),
            Neighborhood = request.Neighborhood.Trim(),
            City = request.City.Trim(),
            State = request.State.Trim().ToUpperInvariant(),
            ZipCode = request.ZipCode?.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude
        };

        dbContext.Spaces.Add(space);
        dbContext.SpaceUsers.Add(new SpaceUser
        {
            SpaceId = space.Id,
            UserId = owner.Id,
            Role = SpaceUserRole.SpaceAdmin
        });
        dbContext.SpacePaymentSettings.Add(new SpacePaymentSettings { SpaceId = space.Id });
        dbContext.SpaceCancellationPolicies.Add(new SpaceCancellationPolicy
        {
            SpaceId = space.Id,
            PolicyText = DefaultPolicyText
        });
        dbContext.SpaceNotificationSettings.Add(new SpaceNotificationSettings { SpaceId = space.Id });
        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = owner.Id,
            SpaceId = space.Id,
            Action = "space.created",
            Entity = nameof(Space),
            EntityId = space.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new { space.Name })
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(space);
    }

    public async Task<SpaceDto> UpdateSpaceAsync(
        Guid userId,
        Guid spaceId,
        UpdateSpaceRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        ValidateSpace(request);

        space.Name = request.Name.Trim();
        space.Description = string.IsNullOrWhiteSpace(request.Description)
            ? "Espaço em configuração."
            : request.Description.Trim();
        space.Category = request.Category.Trim();
        space.Phone = request.Phone.Trim();
        space.Whatsapp = string.IsNullOrWhiteSpace(request.Whatsapp)
            ? request.Phone.Trim()
            : request.Whatsapp.Trim();
        space.Address = request.Address.Trim();
        space.Neighborhood = request.Neighborhood.Trim();
        space.City = request.City.Trim();
        space.State = request.State.Trim().ToUpperInvariant();
        space.ZipCode = request.ZipCode?.Trim();
        space.Latitude = request.Latitude;
        space.Longitude = request.Longitude;
        space.UpdatedAt = DateTimeOffset.UtcNow;

        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            SpaceId = space.Id,
            Action = "space.updated",
            Entity = nameof(Space),
            EntityId = space.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new { space.Name })
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return ToDto(space);
    }

    public async Task<IReadOnlyList<SpaceDto>> GetMySpacesAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var spaces = await dbContext.SpaceUsers
            .AsNoTracking()
            .Where(item => item.UserId == userId && item.Active)
            .Select(item => item.Space!)
            .OrderByDescending(space => space.CreatedAt)
            .ToListAsync(cancellationToken);

        return spaces.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<OnboardingChecklistItemDto>> GetOnboardingChecklistAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        return await BuildChecklistAsync(space, cancellationToken);
    }

    public async Task<StarterSetupDto> CompleteStarterSetupAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        var checklist = await BuildChecklistAsync(space, cancellationToken);

        if (!checklist.All(item => item.Complete))
        {
            throw new InvalidOperationException("Configure serviços, profissionais, vínculos, horários e regras antes de publicar.");
        }

        space.Published = true;
        space.OnboardingCompleted = true;
        space.UpdatedAt = DateTimeOffset.UtcNow;

        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            SpaceId = space.Id,
            Action = "space.published",
            Entity = nameof(Space),
            EntityId = space.Id.ToString()
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return new StarterSetupDto(
            ToDto(space),
            await GetServicesAsync(userId, space.Id, cancellationToken),
            await GetProfessionalsAsync(userId, space.Id, cancellationToken),
            await BuildChecklistAsync(space, cancellationToken));
    }

    public async Task<OwnerDashboardDto> GetOwnerDashboardAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        var checklist = await BuildChecklistAsync(space, cancellationToken);
        var today = DateTimeOffset.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var activeServicesCount = await dbContext.Services
            .CountAsync(service => service.SpaceId == space.Id && service.Active && service.OnlineBooking, cancellationToken);
        var activeProfessionalsCount = await dbContext.Professionals
            .CountAsync(professional => professional.SpaceId == space.Id && professional.Active, cancellationToken);
        var todayAppointments = await dbContext.Appointments
            .Where(appointment =>
                appointment.SpaceId == space.Id &&
                appointment.StartDateTime >= today &&
                appointment.StartDateTime < tomorrow &&
                appointment.Status != AppointmentStatus.Cancelled &&
                appointment.Status != AppointmentStatus.Expired)
            .ToListAsync(cancellationToken);
        var futureRevenue = await dbContext.Appointments
            .Where(appointment =>
                appointment.SpaceId == space.Id &&
                appointment.StartDateTime >= DateTimeOffset.UtcNow &&
                appointment.Status != AppointmentStatus.Cancelled &&
                appointment.Status != AppointmentStatus.Expired)
            .SumAsync(appointment => appointment.Total, cancellationToken);
        var pendingPaymentCount = await dbContext.Appointments
            .CountAsync(
                appointment =>
                    appointment.SpaceId == space.Id &&
                    appointment.PaymentStatus == PaymentStatus.Pending &&
                    appointment.Status == AppointmentStatus.Reserved,
                cancellationToken);

        return new OwnerDashboardDto(
            ToDto(space),
            TodayAppointmentsCount: todayAppointments.Count,
            EstimatedRevenue: todayAppointments.Sum(appointment => appointment.Total),
            FutureRevenue: futureRevenue,
            PendingPaymentCount: pendingPaymentCount,
            ActiveServicesCount: activeServicesCount,
            ActiveProfessionalsCount: activeProfessionalsCount,
            ChecklistComplete: checklist.All(item => item.Complete));
    }

    public async Task<IReadOnlyList<ServiceCategoryDto>> GetServiceCategoriesAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var categories = await dbContext.ServiceCategories
            .AsNoTracking()
            .Where(category => category.SpaceId == spaceId && category.Active)
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken);

        return categories.Select(ToDto).ToList();
    }

    public async Task<ServiceCategoryDto> CreateServiceCategoryAsync(
        Guid userId,
        Guid spaceId,
        UpsertServiceCategoryRequest request,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidateRequired(request.Name, "Nome da categoria");

        var existing = await dbContext.ServiceCategories
            .FirstOrDefaultAsync(
                category => category.SpaceId == spaceId && category.Name.ToLower() == request.Name.Trim().ToLower(),
                cancellationToken);

        if (existing is not null)
        {
            existing.Active = true;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            return ToDto(existing);
        }

        var category = new ServiceCategory
        {
            SpaceId = spaceId,
            Name = request.Name.Trim()
        };

        dbContext.ServiceCategories.Add(category);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(category);
    }

    public async Task<IReadOnlyList<ServiceDto>> GetServicesAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var services = await dbContext.Services
            .AsNoTracking()
            .Where(service => service.SpaceId == spaceId)
            .OrderBy(service => service.Name)
            .ToListAsync(cancellationToken);

        return services.Select(ToDto).ToList();
    }

    public async Task<ServiceDto> CreateServiceAsync(
        Guid userId,
        Guid spaceId,
        UpsertServiceRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidateService(request);

        var service = new Service
        {
            SpaceId = space.Id,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price,
            DurationMinutes = request.DurationMinutes,
            BufferAfterMinutes = request.BufferAfterMinutes,
            OnlineBooking = request.OnlineBooking,
            Active = request.Active
        };

        dbContext.Services.Add(service);
        await EnsureCategoryAsync(space.Id, service.Category, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return ToDto(service);
    }

    public async Task<ServiceDto> UpdateServiceAsync(
        Guid userId,
        Guid spaceId,
        Guid serviceId,
        UpsertServiceRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidateService(request);

        var service = await dbContext.Services
            .FirstOrDefaultAsync(item => item.Id == serviceId && item.SpaceId == space.Id, cancellationToken);

        if (service is null)
        {
            throw new KeyNotFoundException("Serviço não encontrado.");
        }

        service.Name = request.Name.Trim();
        service.Description = request.Description.Trim();
        service.Category = request.Category.Trim();
        service.Price = request.Price;
        service.DurationMinutes = request.DurationMinutes;
        service.BufferAfterMinutes = request.BufferAfterMinutes;
        service.OnlineBooking = request.OnlineBooking;
        service.Active = request.Active;
        service.UpdatedAt = DateTimeOffset.UtcNow;

        await EnsureCategoryAsync(space.Id, service.Category, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return ToDto(service);
    }

    public async Task<IReadOnlyList<ProfessionalDto>> GetProfessionalsAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var professionals = await dbContext.Professionals
            .AsNoTracking()
            .Include(professional => professional.ProfessionalServices)
            .Where(professional => professional.SpaceId == spaceId)
            .OrderBy(professional => professional.Name)
            .ToListAsync(cancellationToken);

        return professionals.Select(ToDto).ToList();
    }

    public async Task<ProfessionalDto> CreateProfessionalAsync(
        Guid userId,
        Guid spaceId,
        UpsertProfessionalRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        await ValidateProfessionalAsync(space.Id, null, request, cancellationToken);

        var professional = new Professional
        {
            SpaceId = space.Id,
            Name = request.Name.Trim(),
            Email = NormalizeOptionalEmail(request.Email),
            Specialty = request.Specialty.Trim(),
            ExperienceYears = request.ExperienceYears,
            Active = request.Active
        };

        dbContext.Professionals.Add(professional);
        await dbContext.SaveChangesAsync(cancellationToken);
        await ReplaceProfessionalServicesAsync(professional, request.ServiceIds, cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return ToDto(professional);
    }

    public async Task<ProfessionalDto> UpdateProfessionalAsync(
        Guid userId,
        Guid spaceId,
        Guid professionalId,
        UpsertProfessionalRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        await ValidateProfessionalAsync(space.Id, professionalId, request, cancellationToken);

        var professional = await dbContext.Professionals
            .Include(item => item.ProfessionalServices)
            .FirstOrDefaultAsync(item => item.Id == professionalId && item.SpaceId == space.Id, cancellationToken);

        if (professional is null)
        {
            throw new KeyNotFoundException("Profissional não encontrada.");
        }

        professional.Name = request.Name.Trim();
        professional.Email = NormalizeOptionalEmail(request.Email);
        professional.Specialty = request.Specialty.Trim();
        professional.ExperienceYears = request.ExperienceYears;
        professional.Active = request.Active;
        professional.UpdatedAt = DateTimeOffset.UtcNow;

        await ReplaceProfessionalServicesAsync(professional, request.ServiceIds, cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return ToDto(professional);
    }

    public async Task<IReadOnlyList<OpeningHourDto>> GetOpeningHoursAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        return await GetOpeningHoursForSpaceAsync(spaceId, cancellationToken);
    }

    public async Task<IReadOnlyList<OpeningHourDto>> UpdateOpeningHoursAsync(
        Guid userId,
        Guid spaceId,
        UpdateOpeningHoursRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidateOpeningHours(request.Hours);

        var existing = await dbContext.SpaceOpeningHours
            .Where(hour => hour.SpaceId == space.Id)
            .ToListAsync(cancellationToken);

        foreach (var input in request.Hours)
        {
            var hour = existing.FirstOrDefault(item => item.DayOfWeek == input.DayOfWeek);

            if (hour is null)
            {
                hour = new SpaceOpeningHour
                {
                    SpaceId = space.Id,
                    DayOfWeek = input.DayOfWeek
                };
                dbContext.SpaceOpeningHours.Add(hour);
            }

            hour.IsOpen = input.IsOpen;
            hour.StartTime = input.IsOpen ? input.StartTime : null;
            hour.EndTime = input.IsOpen ? input.EndTime : null;
            hour.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return await GetOpeningHoursForSpaceAsync(space.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<ProfessionalScheduleDto>> GetProfessionalScheduleAsync(
        Guid userId,
        Guid spaceId,
        Guid professionalId,
        CancellationToken cancellationToken)
    {
        await EnsureOwnedProfessionalAsync(userId, spaceId, professionalId, cancellationToken);

        var schedules = await dbContext.ProfessionalSchedules
            .AsNoTracking()
            .Where(schedule => schedule.ProfessionalId == professionalId)
            .OrderBy(schedule => schedule.DayOfWeek)
            .ToListAsync(cancellationToken);

        return schedules.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<ProfessionalScheduleDto>> UpdateProfessionalScheduleAsync(
        Guid userId,
        Guid spaceId,
        Guid professionalId,
        UpdateProfessionalScheduleRequest request,
        CancellationToken cancellationToken)
    {
        var professional = await EnsureOwnedProfessionalAsync(userId, spaceId, professionalId, cancellationToken);
        ValidateProfessionalSchedules(request.Schedules);

        var existing = await dbContext.ProfessionalSchedules
            .Where(schedule => schedule.ProfessionalId == professional.Id)
            .ToListAsync(cancellationToken);

        foreach (var input in request.Schedules)
        {
            var schedule = existing.FirstOrDefault(item => item.DayOfWeek == input.DayOfWeek);

            if (schedule is null)
            {
                schedule = new ProfessionalSchedule
                {
                    ProfessionalId = professional.Id,
                    DayOfWeek = input.DayOfWeek,
                    StartTime = input.StartTime.Trim(),
                    EndTime = input.EndTime.Trim()
                };
                dbContext.ProfessionalSchedules.Add(schedule);
            }

            schedule.StartTime = input.StartTime.Trim();
            schedule.EndTime = input.EndTime.Trim();
            schedule.BreakStartTime = string.IsNullOrWhiteSpace(input.BreakStartTime) ? null : input.BreakStartTime.Trim();
            schedule.BreakEndTime = string.IsNullOrWhiteSpace(input.BreakEndTime) ? null : input.BreakEndTime.Trim();
            schedule.Active = input.Active;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicationAsync(professional.Space!, cancellationToken);

        return await GetProfessionalScheduleAsync(userId, spaceId, professionalId, cancellationToken);
    }

    public async Task<IReadOnlyList<BlockedTimeDto>> GetBlockedTimesAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var blockedTimes = await dbContext.BlockedTimes
            .AsNoTracking()
            .Where(block => block.SpaceId == spaceId && block.Active)
            .OrderBy(block => block.Date)
            .ThenBy(block => block.StartTime)
            .ToListAsync(cancellationToken);

        return blockedTimes.Select(ToDto).ToList();
    }

    public async Task<BlockedTimeDto> CreateBlockedTimeAsync(
        Guid userId,
        Guid spaceId,
        CreateBlockedTimeRequest request,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        if (request.ProfessionalId is not null)
        {
            await EnsureOwnedProfessionalAsync(userId, spaceId, request.ProfessionalId.Value, cancellationToken);
        }

        ValidateDate(request.Date);
        ValidateTimeRange(request.StartTime, request.EndTime);
        ValidateRequired(request.Reason, "Motivo do bloqueio");

        var blockedTime = new BlockedTime
        {
            SpaceId = spaceId,
            ProfessionalId = request.ProfessionalId,
            Date = request.Date.Trim(),
            StartTime = request.StartTime.Trim(),
            EndTime = request.EndTime.Trim(),
            Reason = request.Reason.Trim()
        };

        dbContext.BlockedTimes.Add(blockedTime);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(blockedTime);
    }

    public async Task DeleteBlockedTimeAsync(
        Guid userId,
        Guid spaceId,
        Guid blockedTimeId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var blockedTime = await dbContext.BlockedTimes
            .FirstOrDefaultAsync(block => block.Id == blockedTimeId && block.SpaceId == spaceId, cancellationToken);

        if (blockedTime is null)
        {
            throw new KeyNotFoundException("Bloqueio não encontrado.");
        }

        blockedTime.Active = false;
        blockedTime.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<SpaceBookingSettingsDto> GetBookingSettingsAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        return ToBookingSettingsDto(space);
    }

    public async Task<SpaceBookingSettingsDto> UpdateBookingSettingsAsync(
        Guid userId,
        Guid spaceId,
        UpdateSpaceBookingSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        space.AllowOnlineBooking = request.AllowOnlineBooking;
        space.RequireManualApproval = request.RequireManualApproval;
        space.UpdatedAt = DateTimeOffset.UtcNow;

        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            SpaceId = space.Id,
            Action = "space.booking_settings.updated",
            Entity = nameof(Space),
            EntityId = space.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new
            {
                space.AllowOnlineBooking,
                space.RequireManualApproval
            })
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToBookingSettingsDto(space);
    }

    public async Task<SpacePaymentSettingsDto> GetPaymentSettingsAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var settings = await GetOrCreatePaymentSettingsAsync(spaceId, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(settings);
    }

    public async Task<SpacePaymentSettingsDto> UpdatePaymentSettingsAsync(
        Guid userId,
        Guid spaceId,
        UpdatePaymentSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidatePaymentSettings(request);

        var settings = await GetOrCreatePaymentSettingsAsync(space.Id, cancellationToken);
        settings.AllowPix = request.AllowPix;
        settings.AllowCreditCard = request.AllowCreditCard;
        settings.AllowDebitCard = request.AllowDebitCard;
        settings.AllowPayOnSite = request.AllowPayOnSite;
        settings.RequirePrePayment = request.RequirePrePayment;
        settings.RequireDeposit = request.RequireDeposit;
        settings.DepositType = request.DepositType?.Trim();
        settings.DepositValue = request.DepositValue;
        settings.ServiceFeePercentage = request.ServiceFeePercentage;
        settings.ReservationExpirationMinutes = request.ReservationExpirationMinutes;
        settings.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return ToDto(settings);
    }

    public async Task<SpaceCancellationPolicyDto> GetCancellationPolicyAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var policy = await GetOrCreateCancellationPolicyAsync(spaceId, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(policy);
    }

    public async Task<SpaceCancellationPolicyDto> UpdateCancellationPolicyAsync(
        Guid userId,
        Guid spaceId,
        UpdateCancellationPolicyRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidateCancellationPolicy(request);

        var policy = await GetOrCreateCancellationPolicyAsync(space.Id, cancellationToken);
        policy.AllowCustomerCancel = request.AllowCustomerCancel;
        policy.FreeCancelBeforeHours = request.FreeCancelBeforeHours;
        policy.AllowReschedule = request.AllowReschedule;
        policy.FreeRescheduleBeforeHours = request.FreeRescheduleBeforeHours;
        policy.ChargeLateCancelFee = request.ChargeLateCancelFee;
        policy.LateCancelFee = request.LateCancelFee;
        policy.PolicyText = request.PolicyText.Trim();
        policy.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublicationAsync(space, cancellationToken);

        return ToDto(policy);
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetSpaceAppointmentsAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var appointments = await dbContext.Appointments
            .AsNoTracking()
            .Include(appointment => appointment.AppointmentServices)
            .Where(appointment => appointment.SpaceId == spaceId)
            .OrderByDescending(appointment => appointment.StartDateTime)
            .Take(100)
            .ToListAsync(cancellationToken);

        return appointments.Select(ToDto).ToList();
    }

    public async Task<AppointmentDetailsDto> GetSpaceAppointmentDetailsAsync(
        Guid userId,
        Guid spaceId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var appointment = await GetAppointmentWithDetailsAsync(appointmentId, cancellationToken);
        if (appointment.SpaceId != spaceId)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return ToDetailsDto(appointment);
    }

    public async Task<AppointmentDto> ConfirmSpaceAppointmentAsync(
        Guid userId,
        Guid spaceId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        var appointment = await GetAppointmentForMutationAsync(appointmentId, cancellationToken);

        if (appointment.SpaceId != space.Id)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        if (appointment.Status != AppointmentStatus.PendingConfirmation)
        {
            throw new InvalidOperationException("Apenas agendamentos aguardando confirmação podem ser aceitos.");
        }

        appointment.Status = AppointmentStatus.Confirmed;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            SpaceId = appointment.SpaceId,
            Action = "appointment.confirmed",
            Entity = nameof(Appointment),
            EntityId = appointment.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new { appointment.Code })
        });

        var settings = await GetOrCreateNotificationSettingsAsync(appointment.SpaceId, cancellationToken);
        if (settings.NotifyCustomerOnBooking)
        {
            await QueueAppointmentNotificationAsync(
                appointment,
                appointment.CustomerId,
                "Agendamento confirmado",
                $"Seu agendamento {appointment.Code} foi confirmado pelo espaço.",
                cancellationToken);
        }

        if (settings.NotifyProfessionalOnBooking)
        {
            await QueueProfessionalNotificationAsync(
                appointment,
                "Novo atendimento confirmado",
                $"Você tem um novo atendimento confirmado no agendamento {appointment.Code}.",
                cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(appointment);
    }

    public async Task<AppointmentDto> CompleteSpaceAppointmentAsync(
        Guid userId,
        Guid spaceId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        var appointment = await GetAppointmentForMutationAsync(appointmentId, cancellationToken);

        if (appointment.SpaceId != spaceId)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return await SetAppointmentStatusAsync(
            userId,
            appointment,
            AppointmentStatus.Completed,
            "appointment.completed",
            "Atendimento concluído",
            "Seu atendimento foi marcado como concluído.",
            cancellationToken);
    }

    public async Task<AppointmentDto> MarkSpaceAppointmentNoShowAsync(
        Guid userId,
        Guid spaceId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        var appointment = await GetAppointmentForMutationAsync(appointmentId, cancellationToken);

        if (appointment.SpaceId != spaceId)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return await SetAppointmentStatusAsync(
            userId,
            appointment,
            AppointmentStatus.NoShow,
            "appointment.no_show",
            "Falta registrada",
            "O espaço registrou ausência neste atendimento.",
            cancellationToken);
    }

    public async Task<IReadOnlyList<SpacePhotoDto>> GetSpacePhotosAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var photos = await dbContext.SpacePhotos
            .AsNoTracking()
            .Where(photo => photo.SpaceId == spaceId && photo.Active)
            .OrderBy(photo => photo.SortOrder)
            .ThenBy(photo => photo.CreatedAt)
            .ToListAsync(cancellationToken);

        return photos.Select(ToDto).ToList();
    }

    public async Task<SpacePhotoDto> CreateSpacePhotoAsync(
        Guid userId,
        Guid spaceId,
        UpsertSpacePhotoRequest request,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidateRequired(request.Url, "URL da foto");

        if (!Uri.TryCreate(request.Url.Trim(), UriKind.Absolute, out _))
        {
            throw new InvalidOperationException("Informe uma URL de foto válida.");
        }

        var photo = new SpacePhoto
        {
            SpaceId = space.Id,
            Url = request.Url.Trim(),
            Caption = string.IsNullOrWhiteSpace(request.Caption) ? null : request.Caption.Trim(),
            SortOrder = request.SortOrder,
            Active = request.Active
        };

        dbContext.SpacePhotos.Add(photo);
        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            SpaceId = space.Id,
            Action = "space.photo.created",
            Entity = nameof(SpacePhoto),
            EntityId = photo.Id.ToString()
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(photo);
    }

    public async Task DeleteSpacePhotoAsync(
        Guid userId,
        Guid spaceId,
        Guid photoId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);

        var photo = await dbContext.SpacePhotos
            .FirstOrDefaultAsync(item => item.Id == photoId && item.SpaceId == spaceId, cancellationToken);

        if (photo is null)
        {
            throw new KeyNotFoundException("Foto não encontrada.");
        }

        photo.Active = false;
        photo.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<SpaceNotificationSettingsDto> GetNotificationSettingsAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        var settings = await GetOrCreateNotificationSettingsAsync(spaceId, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(settings);
    }

    public async Task<SpaceNotificationSettingsDto> UpdateNotificationSettingsAsync(
        Guid userId,
        Guid spaceId,
        UpdateNotificationSettingsRequest request,
        CancellationToken cancellationToken)
    {
        await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        ValidateNotificationSettings(request);

        var settings = await GetOrCreateNotificationSettingsAsync(spaceId, cancellationToken);
        settings.NotifyCustomerOnBooking = request.NotifyCustomerOnBooking;
        settings.NotifyCustomerOnCancel = request.NotifyCustomerOnCancel;
        settings.NotifyCustomerOnReschedule = request.NotifyCustomerOnReschedule;
        settings.NotifyOwnerOnBooking = request.NotifyOwnerOnBooking;
        settings.NotifyProfessionalOnBooking = request.NotifyProfessionalOnBooking;
        settings.ReminderHoursBefore = request.ReminderHoursBefore;
        settings.Active = request.Active;
        settings.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(settings);
    }

    public async Task<IReadOnlyList<PublicSpaceListItemDto>> GetPublishedSpacesAsync(
        double? latitude,
        double? longitude,
        CancellationToken cancellationToken)
    {
        ValidateSearchCoordinates(latitude, longitude);
        var canCalculateDistance = latitude.HasValue && longitude.HasValue;

        var spaces = await dbContext.Spaces
            .AsNoTracking()
            .Where(space =>
                space.Active &&
                space.Published &&
                space.OnboardingCompleted &&
                space.Services.Any(service => service.Active && service.OnlineBooking) &&
                space.Professionals.Any(professional =>
                    professional.Active &&
                    professional.ProfessionalServices.Any(link => link.Service != null && link.Service.Active)) &&
                dbContext.SpaceOpeningHours.Any(hour =>
                    hour.SpaceId == space.Id &&
                    hour.IsOpen &&
                    hour.StartTime != null &&
                    hour.EndTime != null) &&
                dbContext.SpacePaymentSettings.Any(settings => settings.SpaceId == space.Id) &&
                dbContext.SpaceCancellationPolicies.Any(policy =>
                    policy.SpaceId == space.Id &&
                    policy.PolicyText != ""))
            .OrderBy(space => space.Name)
            .Select(space => new
            {
                Space = space,
                MinPrice = space.Services
                    .Where(service => service.Active && service.OnlineBooking)
                    .Select(service => (decimal?)service.Price)
                    .Min() ?? 0,
                ServicesCount = space.Services.Count(service => service.Active && service.OnlineBooking),
                ProfessionalsCount = space.Professionals.Count(professional => professional.Active)
            })
            .ToListAsync(cancellationToken);

        return spaces
            .Select(item =>
            {
                var distanceKm =
                    canCalculateDistance &&
                    item.Space.Latitude.HasValue &&
                    item.Space.Longitude.HasValue
                        ? CalculateDistanceKm(
                            latitude!.Value,
                            longitude!.Value,
                            item.Space.Latitude.Value,
                            item.Space.Longitude.Value)
                        : (double?)null;

                return new
                {
                    Item = item,
                    DistanceKm = distanceKm
                };
            })
            .OrderBy(item => item.DistanceKm.HasValue ? 0 : 1)
            .ThenBy(item => item.DistanceKm ?? double.MaxValue)
            .ThenBy(item => item.Item.Space.Name)
            .Select(item => new PublicSpaceListItemDto(
                item.Item.Space.Id,
                item.Item.Space.Name,
                item.Item.Space.Description,
                item.Item.Space.Category,
                item.Item.Space.Address,
                item.Item.Space.Neighborhood,
                item.Item.Space.City,
                item.Item.Space.State,
                item.Item.Space.Phone,
                item.Item.Space.Whatsapp,
                item.Item.Space.Latitude,
                item.Item.Space.Longitude,
                item.DistanceKm,
                item.Item.MinPrice,
                item.Item.ServicesCount,
                item.Item.ProfessionalsCount))
            .ToList();
    }

    public async Task<PublicSpaceDetailsDto> GetPublishedSpaceDetailsAsync(
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var space = await dbContext.Spaces
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item =>
                    item.Id == spaceId &&
                    item.Active &&
                    item.Published &&
                    item.OnboardingCompleted &&
                    item.Services.Any(service => service.Active && service.OnlineBooking) &&
                    item.Professionals.Any(professional =>
                        professional.Active &&
                        professional.ProfessionalServices.Any(link => link.Service != null && link.Service.Active)) &&
                    dbContext.SpaceOpeningHours.Any(hour =>
                        hour.SpaceId == item.Id &&
                        hour.IsOpen &&
                        hour.StartTime != null &&
                        hour.EndTime != null) &&
                    dbContext.SpacePaymentSettings.Any(settings => settings.SpaceId == item.Id) &&
                    dbContext.SpaceCancellationPolicies.Any(policy =>
                        policy.SpaceId == item.Id &&
                        policy.PolicyText != ""),
                cancellationToken);

        if (space is null)
        {
            throw new KeyNotFoundException("Espaço publicado não encontrado.");
        }

        var categories = await dbContext.ServiceCategories
            .AsNoTracking()
            .Where(category => category.SpaceId == space.Id && category.Active)
            .OrderBy(category => category.Name)
            .ToListAsync(cancellationToken);
        var services = await dbContext.Services
            .AsNoTracking()
            .Where(service => service.SpaceId == space.Id && service.Active && service.OnlineBooking)
            .OrderBy(service => service.Name)
            .ToListAsync(cancellationToken);
        var professionals = await dbContext.Professionals
            .AsNoTracking()
            .Include(professional => professional.ProfessionalServices)
            .Where(professional => professional.SpaceId == space.Id && professional.Active)
            .OrderBy(professional => professional.Name)
            .ToListAsync(cancellationToken);
        var photos = await dbContext.SpacePhotos
            .AsNoTracking()
            .Where(photo => photo.SpaceId == space.Id && photo.Active)
            .OrderBy(photo => photo.SortOrder)
            .ThenBy(photo => photo.CreatedAt)
            .ToListAsync(cancellationToken);
        var openingHours = await GetOpeningHoursForSpaceAsync(space.Id, cancellationToken);
        var paymentSettings = await GetOrCreatePaymentSettingsAsync(space.Id, cancellationToken);
        var cancellationPolicy = await GetOrCreateCancellationPolicyAsync(space.Id, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new PublicSpaceDetailsDto(
            ToDto(space),
            photos.Select(ToDto).ToList(),
            categories.Select(ToDto).ToList(),
            services.Select(ToDto).ToList(),
            professionals.Select(ToDto).ToList(),
            openingHours,
            ToDto(paymentSettings),
            ToDto(cancellationPolicy));
    }

    public async Task<IReadOnlyList<ProfessionalDto>> GetCompatibleProfessionalsAsync(
        Guid spaceId,
        IReadOnlyList<Guid> serviceIds,
        CancellationToken cancellationToken)
    {
        var professionals = await GetCompatibleProfessionalsQuery(spaceId, serviceIds)
            .AsNoTracking()
            .OrderBy(professional => professional.Name)
            .ToListAsync(cancellationToken);

        return professionals.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<TimeSlotDto>> SearchAvailabilityAsync(
        AvailabilitySearchRequest request,
        CancellationToken cancellationToken)
    {
        ValidateDate(request.Date);

        if (request.ServiceIds.Count == 0)
        {
            return [];
        }

        var space = await dbContext.Spaces
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == request.SpaceId && item.Active && item.Published && item.OnboardingCompleted,
                cancellationToken);

        if (space is null)
        {
            throw new KeyNotFoundException("Espaço publicado não encontrado.");
        }

        if (!space.AllowOnlineBooking)
        {
            return [];
        }

        var selectedServices = await dbContext.Services
            .AsNoTracking()
            .Where(service =>
                request.ServiceIds.Contains(service.Id) &&
                service.SpaceId == space.Id &&
                service.Active &&
                service.OnlineBooking)
            .ToListAsync(cancellationToken);

        if (selectedServices.Count != request.ServiceIds.Distinct().Count())
        {
            throw new InvalidOperationException("Um ou mais serviços não estão disponíveis para agendamento.");
        }

        var totalMinutes = selectedServices.Sum(service => service.DurationMinutes + service.BufferAfterMinutes);
        var date = DateOnly.Parse(request.Date);
        var dayOfWeek = (int)date.DayOfWeek;
        var openingHour = await dbContext.SpaceOpeningHours
            .AsNoTracking()
            .FirstOrDefaultAsync(
                hour => hour.SpaceId == space.Id && hour.DayOfWeek == dayOfWeek && hour.IsOpen,
                cancellationToken);

        if (openingHour is null || string.IsNullOrWhiteSpace(openingHour.StartTime) || string.IsNullOrWhiteSpace(openingHour.EndTime))
        {
            return [];
        }

        var compatibleQuery = GetCompatibleProfessionalsQuery(space.Id, request.ServiceIds);

        if (!request.AnyProfessional && request.ProfessionalId is not null)
        {
            compatibleQuery = compatibleQuery.Where(professional => professional.Id == request.ProfessionalId.Value);
        }

        var professionals = await compatibleQuery
            .AsNoTracking()
            .Include(professional => professional.Schedules)
            .OrderBy(professional => professional.Name)
            .ToListAsync(cancellationToken);

        if (professionals.Count == 0)
        {
            return [];
        }

        var professionalIds = professionals.Select(professional => professional.Id).ToList();
        var blockedTimes = await dbContext.BlockedTimes
            .AsNoTracking()
            .Where(block =>
                block.SpaceId == space.Id &&
                block.Active &&
                block.Date == request.Date &&
                (block.ProfessionalId == null || professionalIds.Contains(block.ProfessionalId.Value)))
            .ToListAsync(cancellationToken);
        var dateStart = ToDateTimeOffset(request.Date, "00:00");
        var dateEnd = dateStart.AddDays(1);
        var appointments = await dbContext.Appointments
            .AsNoTracking()
            .Where(appointment =>
                appointment.SpaceId == space.Id &&
                professionalIds.Contains(appointment.ProfessionalId) &&
                appointment.StartDateTime < dateEnd &&
                appointment.EndDateTime > dateStart &&
                (appointment.Status == AppointmentStatus.Confirmed ||
                    appointment.Status == AppointmentStatus.PendingConfirmation ||
                    (appointment.Status == AppointmentStatus.Reserved &&
                        (appointment.ExpiresAt == null || appointment.ExpiresAt > DateTimeOffset.UtcNow))))
            .ToListAsync(cancellationToken);
        var slotsByStartTime = new Dictionary<string, TimeSlotDto>();

        foreach (var professional in professionals)
        {
            var schedule = professional.Schedules.FirstOrDefault(item => item.DayOfWeek == dayOfWeek && item.Active);

            if (schedule is null)
            {
                continue;
            }

            var startMinute = Math.Max(MinutesFromTime(openingHour.StartTime), MinutesFromTime(schedule.StartTime));
            var endMinute = Math.Min(MinutesFromTime(openingHour.EndTime), MinutesFromTime(schedule.EndTime));

            for (var cursor = startMinute; cursor + totalMinutes <= endMinute; cursor += DefaultSlotGranularityMinutes)
            {
                var startTime = TimeFromMinutes(cursor);
                var endTime = TimeFromMinutes(cursor + totalMinutes);

                if (IsPastLocalSlot(request.Date, startTime) ||
                    OverlapsBreak(cursor, cursor + totalMinutes, schedule.BreakStartTime, schedule.BreakEndTime) ||
                    OverlapsBlock(blockedTimes, professional.Id, startTime, endTime) ||
                    OverlapsAppointment(appointments, professional.Id, request.Date, startTime, endTime))
                {
                    continue;
                }

                var slot = new TimeSlotDto(
                    $"{request.Date}-{professional.Id}-{startTime}",
                    request.Date,
                    startTime,
                    endTime,
                    professional.Id,
                    professional.Name,
                    true,
                    null);

                if (request.AnyProfessional)
                {
                    slotsByStartTime.TryAdd(startTime, slot);
                }
                else
                {
                    slotsByStartTime[slot.Id] = slot;
                }
            }
        }

        return slotsByStartTime.Values
            .OrderBy(slot => slot.StartTime)
            .ThenBy(slot => slot.ProfessionalName)
            .ToList();
    }

    public async Task<AppointmentDto> ReserveAppointmentAsync(
        Guid customerId,
        ReserveAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var customer = await dbContext.Users
            .FirstOrDefaultAsync(user => user.Id == customerId && user.Active, cancellationToken);

        if (customer is null || customer.Role != UserRole.Customer)
        {
            throw new UnauthorizedAccessException("Somente clientes podem reservar horários.");
        }

        var space = await dbContext.Spaces
            .FirstOrDefaultAsync(
                item => item.Id == request.SpaceId && item.Active && item.Published && item.OnboardingCompleted,
                cancellationToken);

        if (space is null)
        {
            throw new KeyNotFoundException("Espaço publicado não encontrado.");
        }

        if (!space.AllowOnlineBooking)
        {
            throw new InvalidOperationException("Este espaço não está aceitando novos agendamentos agora.");
        }

        var availableSlots = await SearchAvailabilityAsync(
            new AvailabilitySearchRequest(
                request.SpaceId,
                request.ServiceIds,
                request.ProfessionalId,
                request.AnyProfessional,
                request.Date),
            cancellationToken);
        var selectedSlot = availableSlots.FirstOrDefault(slot =>
            slot.StartTime == request.StartTime &&
            (request.AnyProfessional || request.ProfessionalId is null || slot.ProfessionalId == request.ProfessionalId.Value));

        if (selectedSlot is null)
        {
            throw new InvalidOperationException("Horário indisponível. Escolha outro horário.");
        }

        var services = await dbContext.Services
            .Where(service => request.ServiceIds.Contains(service.Id) && service.SpaceId == request.SpaceId)
            .ToListAsync(cancellationToken);
        var paymentSettings = await GetOrCreatePaymentSettingsAsync(request.SpaceId, cancellationToken);
        var paymentMethodId = request.PaymentMethodId.Trim().ToLowerInvariant();

        ValidatePaymentMethod(paymentSettings, paymentMethodId);

        var subtotal = services.Sum(service => service.Price);
        var serviceFee = Math.Round(subtotal * (paymentSettings.ServiceFeePercentage / 100), 2);
        var onlinePayment = paymentMethodId is "pix" or "credit_card" or "debit_card";
        var requiresManualApproval = space.RequireManualApproval && !onlinePayment;
        var now = DateTimeOffset.UtcNow;
        var appointment = new Appointment
        {
            Code = $"NA-{now:yyMMddHHmmss}-{Random.Shared.Next(100, 999)}",
            CustomerId = customer.Id,
            SpaceId = request.SpaceId,
            ProfessionalId = selectedSlot.ProfessionalId,
            AnyProfessional = request.AnyProfessional,
            StartDateTime = ToDateTimeOffset(request.Date, selectedSlot.StartTime),
            EndDateTime = ToDateTimeOffset(request.Date, selectedSlot.EndTime),
            TotalDurationMinutes = services.Sum(service => service.DurationMinutes),
            Subtotal = subtotal,
            ServiceFee = serviceFee,
            Total = subtotal + serviceFee,
            Status = onlinePayment
                ? AppointmentStatus.Reserved
                : requiresManualApproval
                    ? AppointmentStatus.PendingConfirmation
                    : AppointmentStatus.Confirmed,
            PaymentMethodId = paymentMethodId,
            PaymentStatus = onlinePayment ? PaymentStatus.Pending : PaymentStatus.NotRequired,
            ExpiresAt = onlinePayment ? now.AddMinutes(paymentSettings.ReservationExpirationMinutes) : null
        };

        foreach (var service in services)
        {
            appointment.AppointmentServices.Add(new AppointmentService
            {
                ServiceId = service.Id,
                Price = service.Price,
                DurationMinutes = service.DurationMinutes
            });
        }

        dbContext.Appointments.Add(appointment);
        await QueueBookingNotificationsAsync(appointment, cancellationToken);
        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = customer.Id,
            SpaceId = appointment.SpaceId,
            Action = "appointment.created",
            Entity = nameof(Appointment),
            EntityId = appointment.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new { appointment.Code, appointment.PaymentMethodId })
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ToDto(appointment);
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetCustomerAppointmentsAsync(
        Guid customerId,
        CancellationToken cancellationToken)
    {
        var appointments = await dbContext.Appointments
            .AsNoTracking()
            .Include(appointment => appointment.AppointmentServices)
            .Where(appointment => appointment.CustomerId == customerId)
            .OrderByDescending(appointment => appointment.StartDateTime)
            .Take(100)
            .ToListAsync(cancellationToken);

        return appointments.Select(ToDto).ToList();
    }

    public async Task<AppointmentDetailsDto> GetCustomerAppointmentDetailsAsync(
        Guid customerId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var appointment = await GetAppointmentWithDetailsAsync(appointmentId, cancellationToken);

        if (appointment.CustomerId != customerId)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return ToDetailsDto(appointment);
    }

    public async Task<AppointmentDto> CancelCustomerAppointmentAsync(
        Guid customerId,
        Guid appointmentId,
        CancelAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var appointment = await GetAppointmentForMutationAsync(appointmentId, cancellationToken);

        if (appointment.CustomerId != customerId)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        var policy = await GetOrCreateCancellationPolicyAsync(appointment.SpaceId, cancellationToken);
        if (!policy.AllowCustomerCancel)
        {
            throw new InvalidOperationException("Este espaço não permite cancelamento pela cliente.");
        }

        EnsureAppointmentCanChange(appointment);
        appointment.Status = AppointmentStatus.Cancelled;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = customerId,
            SpaceId = appointment.SpaceId,
            Action = "appointment.cancelled",
            Entity = nameof(Appointment),
            EntityId = appointment.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new
            {
                appointment.Code,
                Reason = request.Reason,
                Late = IsInsidePolicyWindow(appointment.StartDateTime, policy.FreeCancelBeforeHours)
            })
        });
        await QueueAppointmentNotificationAsync(
            appointment,
            appointment.CustomerId,
            "Agendamento cancelado",
            $"Seu agendamento {appointment.Code} foi cancelado.",
            cancellationToken);
        await QueueOwnerNotificationsAsync(
            appointment,
            "Agendamento cancelado",
            $"A cliente cancelou o agendamento {appointment.Code}.",
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(appointment);
    }

    public async Task<AppointmentDto> RescheduleCustomerAppointmentAsync(
        Guid customerId,
        Guid appointmentId,
        RescheduleAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var appointment = await GetAppointmentForMutationAsync(appointmentId, cancellationToken);
        if (appointment.CustomerId != customerId)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        var policy = await GetOrCreateCancellationPolicyAsync(appointment.SpaceId, cancellationToken);
        if (!policy.AllowReschedule)
        {
            throw new InvalidOperationException("Este espaço não permite reagendamento pela cliente.");
        }

        EnsureAppointmentCanChange(appointment);
        var lateReschedule = IsInsidePolicyWindow(appointment.StartDateTime, policy.FreeRescheduleBeforeHours);
        ValidateDate(request.Date);
        var serviceIds = appointment.AppointmentServices.Select(item => item.ServiceId).ToList();
        var availableSlots = await SearchAvailabilityAsync(
            new AvailabilitySearchRequest(
                appointment.SpaceId,
                serviceIds,
                request.ProfessionalId,
                request.AnyProfessional,
                request.Date),
            cancellationToken);
        var selectedSlot = availableSlots.FirstOrDefault(slot =>
            slot.StartTime == request.StartTime &&
            (request.AnyProfessional || request.ProfessionalId is null || slot.ProfessionalId == request.ProfessionalId.Value));

        if (selectedSlot is null)
        {
            throw new InvalidOperationException("Novo horário indisponível.");
        }

        appointment.ProfessionalId = selectedSlot.ProfessionalId;
        appointment.AnyProfessional = request.AnyProfessional;
        appointment.StartDateTime = ToDateTimeOffset(request.Date, selectedSlot.StartTime);
        appointment.EndDateTime = ToDateTimeOffset(request.Date, selectedSlot.EndTime);
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = customerId,
            SpaceId = appointment.SpaceId,
            Action = "appointment.rescheduled",
            Entity = nameof(Appointment),
            EntityId = appointment.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new
            {
                appointment.Code,
                Date = request.Date,
                request.StartTime,
                Late = lateReschedule
            })
        });
        await QueueAppointmentNotificationAsync(
            appointment,
            appointment.CustomerId,
            "Agendamento reagendado",
            $"Seu agendamento {appointment.Code} foi reagendado para {request.Date} às {selectedSlot.StartTime}.",
            cancellationToken);
        await QueueOwnerNotificationsAsync(
            appointment,
            "Agendamento reagendado",
            $"A cliente reagendou o agendamento {appointment.Code}.",
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ToDto(appointment);
    }

    public async Task<ReviewDto> CreateAppointmentReviewAsync(
        Guid customerId,
        Guid appointmentId,
        CreateReviewRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Rating is < 1 or > 5)
        {
            throw new InvalidOperationException("A nota deve ficar entre 1 e 5.");
        }

        var appointment = await GetAppointmentWithDetailsAsync(appointmentId, cancellationToken);
        if (appointment.CustomerId != customerId)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        if (appointment.Status != AppointmentStatus.Completed)
        {
            throw new InvalidOperationException("A avaliação fica disponível depois que o atendimento é concluído.");
        }

        var existing = await dbContext.Reviews
            .FirstOrDefaultAsync(review => review.AppointmentId == appointment.Id, cancellationToken);

        if (existing is not null)
        {
            throw new InvalidOperationException("Este agendamento já foi avaliado.");
        }

        var review = new Review
        {
            AppointmentId = appointment.Id,
            SpaceId = appointment.SpaceId,
            CustomerId = customerId,
            Rating = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim()
        };

        dbContext.Reviews.Add(review);
        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = customerId,
            SpaceId = appointment.SpaceId,
            Action = "appointment.reviewed",
            Entity = nameof(Review),
            EntityId = review.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new { review.Rating })
        });
        await QueueOwnerNotificationsAsync(
            appointment,
            "Nova avaliação recebida",
            $"A cliente avaliou o agendamento {appointment.Code} com {review.Rating} estrelas.",
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(review);
    }

    public async Task<IReadOnlyList<AppointmentDto>> GetProfessionalAppointmentsAsync(
        Guid professionalUserId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);

        var appointments = await dbContext.Appointments
            .AsNoTracking()
            .Include(appointment => appointment.AppointmentServices)
            .Where(appointment => appointment.ProfessionalId == professional.Id)
            .OrderByDescending(appointment => appointment.StartDateTime)
            .Take(100)
            .ToListAsync(cancellationToken);

        return appointments.Select(ToDto).ToList();
    }

    public async Task<AppointmentDetailsDto> GetProfessionalAppointmentDetailsAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var appointment = await GetAppointmentWithDetailsAsync(appointmentId, cancellationToken);

        if (appointment.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return ToDetailsDto(appointment);
    }

    public async Task<AppointmentDto> CompleteProfessionalAppointmentAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var appointment = await GetAppointmentForMutationAsync(appointmentId, cancellationToken);

        if (appointment.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return await SetAppointmentStatusAsync(
            professionalUserId,
            appointment,
            AppointmentStatus.Completed,
            "appointment.completed_by_professional",
            "Atendimento concluído",
            "Sua profissional marcou o atendimento como concluído.",
            cancellationToken);
    }

    public async Task<AppointmentDto> MarkProfessionalAppointmentNoShowAsync(
        Guid professionalUserId,
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        var appointment = await GetAppointmentForMutationAsync(appointmentId, cancellationToken);

        if (appointment.ProfessionalId != professional.Id)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return await SetAppointmentStatusAsync(
            professionalUserId,
            appointment,
            AppointmentStatus.NoShow,
            "appointment.no_show_by_professional",
            "Falta registrada",
            "Sua profissional registrou ausência neste atendimento.",
            cancellationToken);
    }

    public async Task<BlockedTimeDto> CreateProfessionalBlockedTimeAsync(
        Guid professionalUserId,
        CreateBlockedTimeRequest request,
        CancellationToken cancellationToken)
    {
        var professional = await GetLinkedProfessionalAsync(professionalUserId, cancellationToken);
        ValidateDate(request.Date);
        ValidateTimeRange(request.StartTime, request.EndTime);
        ValidateRequired(request.Reason, "Motivo do bloqueio");

        var blockedTime = new BlockedTime
        {
            SpaceId = professional.SpaceId,
            ProfessionalId = professional.Id,
            Date = request.Date.Trim(),
            StartTime = request.StartTime.Trim(),
            EndTime = request.EndTime.Trim(),
            Reason = request.Reason.Trim()
        };

        dbContext.BlockedTimes.Add(blockedTime);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(blockedTime);
    }

    public async Task<IReadOnlyList<NotificationDto>> GetMyNotificationsAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var spaceIds = await dbContext.SpaceUsers
            .AsNoTracking()
            .Where(item => item.UserId == userId && item.Active)
            .Select(item => item.SpaceId)
            .ToListAsync(cancellationToken);

        var notifications = await dbContext.Notifications
            .AsNoTracking()
            .Where(notification =>
                notification.UserId == userId ||
                (notification.UserId == null &&
                    notification.SpaceId != null &&
                    spaceIds.Contains(notification.SpaceId.Value)))
            .OrderByDescending(notification => notification.CreatedAt)
            .Take(80)
            .ToListAsync(cancellationToken);

        return notifications.Select(ToDto).ToList();
    }

    public async Task MarkNotificationReadAsync(
        Guid userId,
        Guid notificationId,
        CancellationToken cancellationToken)
    {
        var notification = await dbContext.Notifications
            .FirstOrDefaultAsync(item => item.Id == notificationId, cancellationToken);

        if (notification is null)
        {
            throw new KeyNotFoundException("Notificação não encontrada.");
        }

        if (notification.UserId is not null && notification.UserId != userId)
        {
            throw new UnauthorizedAccessException("Você não tem acesso a esta notificação.");
        }

        notification.Read = true;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> ExpireReservationsAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var expired = await dbContext.Appointments
            .Where(appointment =>
                appointment.Status == AppointmentStatus.Reserved &&
                appointment.ExpiresAt != null &&
                appointment.ExpiresAt <= now)
            .ToListAsync(cancellationToken);

        foreach (var appointment in expired)
        {
            appointment.Status = AppointmentStatus.Expired;
            appointment.PaymentStatus = PaymentStatus.Failed;
            appointment.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return expired.Count;
    }

    private async Task<Space> GetOwnedSpaceAsync(
        Guid userId,
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var space = await dbContext.Spaces
            .Include(space => space.SpaceUsers)
            .FirstOrDefaultAsync(space => space.Id == spaceId && space.Active, cancellationToken);

        if (space is null)
        {
            throw new KeyNotFoundException("Espaço não encontrado.");
        }

        var canManage = space.SpaceUsers.Any(item =>
            item.UserId == userId &&
            item.Active &&
            item.Role is SpaceUserRole.SpaceAdmin or SpaceUserRole.SpaceManager);

        if (!canManage)
        {
            throw new UnauthorizedAccessException("Você não tem permissão para acessar este espaço.");
        }

        return space;
    }

    private async Task<Professional> EnsureOwnedProfessionalAsync(
        Guid userId,
        Guid spaceId,
        Guid professionalId,
        CancellationToken cancellationToken)
    {
        var space = await GetOwnedSpaceAsync(userId, spaceId, cancellationToken);
        var professional = await dbContext.Professionals
            .Include(item => item.Space)
            .FirstOrDefaultAsync(item => item.Id == professionalId && item.SpaceId == space.Id, cancellationToken);

        if (professional is null)
        {
            throw new KeyNotFoundException("Profissional não encontrada.");
        }

        return professional;
    }

    private async Task<Professional> GetLinkedProfessionalAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId && item.Active, cancellationToken);

        if (user is null)
        {
            throw new UnauthorizedAccessException("Usuário autenticado não encontrado.");
        }

        var professional = await dbContext.Professionals
            .Include(item => item.ProfessionalServices)
            .FirstOrDefaultAsync(
                item => item.Active && item.Email != null && item.Email == user.Email,
                cancellationToken);

        if (professional is null)
        {
            throw new InvalidOperationException("Seu e-mail ainda não está vinculado a uma profissional ativa do espaço.");
        }

        return professional;
    }

    private async Task<Appointment> GetAppointmentWithDetailsAsync(
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var appointment = await dbContext.Appointments
            .AsNoTracking()
            .Include(item => item.Space)
            .Include(item => item.Professional)
                .ThenInclude(professional => professional!.ProfessionalServices)
            .Include(item => item.AppointmentServices)
                .ThenInclude(item => item.Service)
            .Include(item => item.Review)
            .FirstOrDefaultAsync(item => item.Id == appointmentId, cancellationToken);

        if (appointment is null || appointment.Space is null || appointment.Professional is null)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return appointment;
    }

    private async Task<Appointment> GetAppointmentForMutationAsync(
        Guid appointmentId,
        CancellationToken cancellationToken)
    {
        var appointment = await dbContext.Appointments
            .Include(item => item.AppointmentServices)
            .FirstOrDefaultAsync(item => item.Id == appointmentId, cancellationToken);

        if (appointment is null)
        {
            throw new KeyNotFoundException("Agendamento não encontrado.");
        }

        return appointment;
    }

    private async Task<AppointmentDto> SetAppointmentStatusAsync(
        Guid userId,
        Appointment appointment,
        AppointmentStatus status,
        string action,
        string notificationTitle,
        string notificationMessage,
        CancellationToken cancellationToken)
    {
        EnsureAppointmentCanClose(appointment);

        appointment.Status = status;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        dbContext.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            SpaceId = appointment.SpaceId,
            Action = action,
            Entity = nameof(Appointment),
            EntityId = appointment.Id.ToString(),
            MetadataJson = JsonSerializer.Serialize(new { appointment.Code, Status = status.ToString() })
        });
        await QueueAppointmentNotificationAsync(
            appointment,
            appointment.CustomerId,
            notificationTitle,
            notificationMessage,
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(appointment);
    }

    private async Task QueueBookingNotificationsAsync(
        Appointment appointment,
        CancellationToken cancellationToken)
    {
        var settings = await GetOrCreateNotificationSettingsAsync(appointment.SpaceId, cancellationToken);

        if (settings.NotifyCustomerOnBooking)
        {
            var title = appointment.Status == AppointmentStatus.PendingConfirmation
                ? "Solicitação enviada"
                : appointment.Status == AppointmentStatus.Reserved
                    ? "Reserva criada"
                    : "Agendamento confirmado";
            var message = appointment.Status == AppointmentStatus.PendingConfirmation
                ? $"Seu agendamento {appointment.Code} aguarda confirmação do espaço."
                : appointment.Status == AppointmentStatus.Reserved
                    ? $"Seu agendamento {appointment.Code} foi reservado e aguarda pagamento."
                    : $"Seu agendamento {appointment.Code} foi criado.";

            await QueueAppointmentNotificationAsync(
                appointment,
                appointment.CustomerId,
                title,
                message,
                cancellationToken);
        }

        if (settings.NotifyOwnerOnBooking)
        {
            var title = appointment.Status == AppointmentStatus.PendingConfirmation
                ? "Novo agendamento para confirmar"
                : "Novo agendamento";
            var message = appointment.Status == AppointmentStatus.PendingConfirmation
                ? $"O agendamento {appointment.Code} aguarda confirmação."
                : $"Novo agendamento {appointment.Code} entrou na agenda.";

            await QueueOwnerNotificationsAsync(
                appointment,
                title,
                message,
                cancellationToken);
        }

        if (settings.NotifyProfessionalOnBooking && appointment.Status != AppointmentStatus.PendingConfirmation)
        {
            await QueueProfessionalNotificationAsync(
                appointment,
                "Novo atendimento",
                $"Você tem um novo atendimento no agendamento {appointment.Code}.",
                cancellationToken);
        }
    }

    private Task QueueAppointmentNotificationAsync(
        Appointment appointment,
        Guid userId,
        string title,
        string message,
        CancellationToken cancellationToken)
    {
        dbContext.Notifications.Add(new Notification
        {
            UserId = userId,
            SpaceId = appointment.SpaceId,
            AppointmentId = appointment.Id,
            Title = title,
            Message = message
        });

        return Task.CompletedTask;
    }

    private async Task QueueOwnerNotificationsAsync(
        Appointment appointment,
        string title,
        string message,
        CancellationToken cancellationToken)
    {
        var ownerIds = await dbContext.SpaceUsers
            .AsNoTracking()
            .Where(item =>
                item.SpaceId == appointment.SpaceId &&
                item.Active &&
                item.Role == SpaceUserRole.SpaceAdmin)
            .Select(item => item.UserId)
            .ToListAsync(cancellationToken);

        foreach (var ownerId in ownerIds)
        {
            dbContext.Notifications.Add(new Notification
            {
                UserId = ownerId,
                SpaceId = appointment.SpaceId,
                AppointmentId = appointment.Id,
                Title = title,
                Message = message
            });
        }
    }

    private async Task QueueProfessionalNotificationAsync(
        Appointment appointment,
        string title,
        string message,
        CancellationToken cancellationToken)
    {
        var professionalEmail = await dbContext.Professionals
            .AsNoTracking()
            .Where(item => item.Id == appointment.ProfessionalId)
            .Select(item => item.Email)
            .FirstOrDefaultAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(professionalEmail))
        {
            return;
        }

        var userId = await dbContext.Users
            .AsNoTracking()
            .Where(item => item.Email == professionalEmail && item.Active)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (userId is null)
        {
            return;
        }

        dbContext.Notifications.Add(new Notification
        {
            UserId = userId,
            SpaceId = appointment.SpaceId,
            AppointmentId = appointment.Id,
            Title = title,
            Message = message
        });
    }

    private async Task<IReadOnlyList<OnboardingChecklistItemDto>> BuildChecklistAsync(
        Space space,
        CancellationToken cancellationToken)
    {
        var activeServicesCount = await dbContext.Services
            .CountAsync(
                service =>
                    service.SpaceId == space.Id &&
                    service.Active &&
                    service.OnlineBooking &&
                    service.Price > 0 &&
                    service.DurationMinutes > 0,
                cancellationToken);
        var activeProfessionalsCount = await dbContext.Professionals
            .CountAsync(professional => professional.SpaceId == space.Id && professional.Active, cancellationToken);
        var professionalServicesCount = await dbContext.ProfessionalServices
            .CountAsync(
                item =>
                    item.Professional != null &&
                    item.Service != null &&
                    item.Professional.SpaceId == space.Id &&
                    item.Professional.Active &&
                    item.Service.Active,
                cancellationToken);
        var openingHoursCount = await dbContext.SpaceOpeningHours
            .CountAsync(hour => hour.SpaceId == space.Id && hour.IsOpen && hour.StartTime != null && hour.EndTime != null, cancellationToken);
        var schedulesCount = await dbContext.ProfessionalSchedules
            .CountAsync(
                schedule =>
                    schedule.Professional != null &&
                    schedule.Professional.SpaceId == space.Id &&
                    schedule.Professional.Active &&
                    schedule.Active,
                cancellationToken);
        var paymentConfigured = await dbContext.SpacePaymentSettings
            .AnyAsync(settings => settings.SpaceId == space.Id, cancellationToken);
        var cancellationConfigured = await dbContext.SpaceCancellationPolicies
            .AnyAsync(policy => policy.SpaceId == space.Id && policy.PolicyText != "", cancellationToken);

        return
        [
            new OnboardingChecklistItemDto(
                "space-data",
                "Dados básicos do espaço",
                HasValue(space.Name) && HasValue(space.Address) && HasValue(space.Phone)),
            new OnboardingChecklistItemDto(
                "services",
                "Pelo menos 1 serviço ativo",
                activeServicesCount > 0),
            new OnboardingChecklistItemDto(
                "professionals",
                "Pelo menos 1 profissional ativa",
                activeProfessionalsCount > 0),
            new OnboardingChecklistItemDto(
                "professional-services",
                "Serviços vinculados a profissionais",
                professionalServicesCount > 0),
            new OnboardingChecklistItemDto(
                "opening-hours",
                "Horário de funcionamento",
                openingHoursCount > 0),
            new OnboardingChecklistItemDto(
                "professional-schedule",
                "Agenda da profissional",
                schedulesCount > 0),
            new OnboardingChecklistItemDto(
                "payment",
                "Forma de pagamento configurada",
                paymentConfigured),
            new OnboardingChecklistItemDto(
                "cancellation",
                "Política de cancelamento",
                cancellationConfigured)
        ];
    }

    private async Task SyncPublicationAsync(Space space, CancellationToken cancellationToken)
    {
        var checklist = await BuildChecklistAsync(space, cancellationToken);
        var complete = checklist.All(item => item.Complete);

        if (space.Published == complete && space.OnboardingCompleted == complete)
        {
            return;
        }

        space.Published = complete;
        space.OnboardingCompleted = complete;
        space.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<Professional> GetCompatibleProfessionalsQuery(Guid spaceId, IReadOnlyList<Guid> serviceIds)
    {
        var distinctServiceIds = serviceIds.Distinct().ToList();

        return dbContext.Professionals
            .Include(professional => professional.ProfessionalServices)
            .Where(professional =>
                professional.SpaceId == spaceId &&
                professional.Active &&
                distinctServiceIds.All(serviceId =>
                    professional.ProfessionalServices.Any(link => link.ServiceId == serviceId)));
    }

    private async Task ReplaceProfessionalServicesAsync(
        Professional professional,
        IReadOnlyList<Guid> serviceIds,
        CancellationToken cancellationToken)
    {
        var existing = await dbContext.ProfessionalServices
            .Where(link => link.ProfessionalId == professional.Id)
            .ToListAsync(cancellationToken);
        dbContext.ProfessionalServices.RemoveRange(existing);

        foreach (var serviceId in serviceIds.Distinct())
        {
            dbContext.ProfessionalServices.Add(new ProfessionalService
            {
                ProfessionalId = professional.Id,
                ServiceId = serviceId
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await dbContext.Entry(professional)
            .Collection(item => item.ProfessionalServices)
            .LoadAsync(cancellationToken);
    }

    private async Task EnsureCategoryAsync(Guid spaceId, string categoryName, CancellationToken cancellationToken)
    {
        var existing = await dbContext.ServiceCategories
            .FirstOrDefaultAsync(
                category => category.SpaceId == spaceId && category.Name.ToLower() == categoryName.ToLower(),
                cancellationToken);

        if (existing is not null)
        {
            existing.Active = true;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            return;
        }

        dbContext.ServiceCategories.Add(new ServiceCategory
        {
            SpaceId = spaceId,
            Name = categoryName
        });
    }

    private async Task<IReadOnlyList<OpeningHourDto>> GetOpeningHoursForSpaceAsync(
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var existing = await dbContext.SpaceOpeningHours
            .AsNoTracking()
            .Where(hour => hour.SpaceId == spaceId)
            .OrderBy(hour => hour.DayOfWeek)
            .ToListAsync(cancellationToken);

        if (existing.Count == 0)
        {
            return Enumerable.Range(0, 7)
                .Select(day => new OpeningHourDto(Guid.Empty, spaceId, day, false, null, null))
                .ToList();
        }

        return existing.Select(ToDto).ToList();
    }

    private async Task<SpacePaymentSettings> GetOrCreatePaymentSettingsAsync(
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var settings = await dbContext.SpacePaymentSettings
            .FirstOrDefaultAsync(item => item.SpaceId == spaceId, cancellationToken);

        if (settings is not null)
        {
            return settings;
        }

        settings = new SpacePaymentSettings { SpaceId = spaceId };
        dbContext.SpacePaymentSettings.Add(settings);

        return settings;
    }

    private async Task<SpaceCancellationPolicy> GetOrCreateCancellationPolicyAsync(
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var policy = await dbContext.SpaceCancellationPolicies
            .FirstOrDefaultAsync(item => item.SpaceId == spaceId, cancellationToken);

        if (policy is not null)
        {
            return policy;
        }

        policy = new SpaceCancellationPolicy
        {
            SpaceId = spaceId,
            PolicyText = DefaultPolicyText
        };
        dbContext.SpaceCancellationPolicies.Add(policy);

        return policy;
    }

    private async Task<SpaceNotificationSettings> GetOrCreateNotificationSettingsAsync(
        Guid spaceId,
        CancellationToken cancellationToken)
    {
        var settings = await dbContext.SpaceNotificationSettings
            .FirstOrDefaultAsync(item => item.SpaceId == spaceId, cancellationToken);

        if (settings is not null)
        {
            return settings;
        }

        settings = new SpaceNotificationSettings { SpaceId = spaceId };
        dbContext.SpaceNotificationSettings.Add(settings);

        return settings;
    }

    private static void ValidateSpace(CreateSpaceRequest request)
    {
        ValidateSpaceFields(
            request.Name,
            request.Category,
            request.Phone,
            request.Address,
            request.Neighborhood,
            request.City,
            request.State);

        if (request.State.Trim().Length != 2)
        {
            throw new InvalidOperationException("UF deve ter 2 caracteres.");
        }

        ValidateCoordinates(request.Latitude, request.Longitude);
    }

    private static void ValidateSpace(UpdateSpaceRequest request)
    {
        ValidateSpaceFields(
            request.Name,
            request.Category,
            request.Phone,
            request.Address,
            request.Neighborhood,
            request.City,
            request.State);

        if (request.State.Trim().Length != 2)
        {
            throw new InvalidOperationException("UF deve ter 2 caracteres.");
        }

        ValidateCoordinates(request.Latitude, request.Longitude);
    }

    private static void ValidateService(UpsertServiceRequest request)
    {
        ValidateRequired(request.Name, "Nome do serviço");
        ValidateRequired(request.Description, "Descrição do serviço");
        ValidateRequired(request.Category, "Categoria do serviço");

        if (request.Price <= 0)
        {
            throw new InvalidOperationException("Preço deve ser maior que zero.");
        }

        if (request.DurationMinutes <= 0)
        {
            throw new InvalidOperationException("Duração deve ser maior que zero.");
        }

        if (request.BufferAfterMinutes < 0)
        {
            throw new InvalidOperationException("Buffer não pode ser negativo.");
        }
    }

    private async Task ValidateProfessionalAsync(
        Guid spaceId,
        Guid? currentProfessionalId,
        UpsertProfessionalRequest request,
        CancellationToken cancellationToken)
    {
        ValidateRequired(request.Name, "Nome da profissional");
        ValidateRequired(request.Specialty, "Especialidade");

        if (request.ExperienceYears < 0)
        {
            throw new InvalidOperationException("Experiência não pode ser negativa.");
        }

        if (request.ServiceIds.Count == 0)
        {
            throw new InvalidOperationException("Vincule pelo menos um serviço à profissional.");
        }

        var email = NormalizeOptionalEmail(request.Email);
        if (email is not null && !email.Contains('@', StringComparison.Ordinal))
        {
            throw new InvalidOperationException("E-mail da profissional inválido.");
        }

        if (email is not null)
        {
            var emailInUse = await dbContext.Professionals.AnyAsync(
                professional =>
                    professional.SpaceId == spaceId &&
                    professional.Email == email &&
                    professional.Id != currentProfessionalId,
                cancellationToken);

            if (emailInUse)
            {
                throw new InvalidOperationException("Este e-mail já está vinculado a outra profissional do espaço.");
            }
        }

        var servicesCount = await dbContext.Services
            .CountAsync(
                service => service.SpaceId == spaceId && service.Active && request.ServiceIds.Contains(service.Id),
                cancellationToken);

        if (servicesCount != request.ServiceIds.Distinct().Count())
        {
            throw new InvalidOperationException("Um ou mais serviços vinculados não pertencem a este espaço.");
        }
    }

    private static void ValidateOpeningHours(IReadOnlyList<OpeningHourInput> hours)
    {
        if (hours.Count == 0)
        {
            throw new InvalidOperationException("Informe pelo menos um dia de funcionamento.");
        }

        foreach (var hour in hours)
        {
            if (hour.DayOfWeek is < 0 or > 6)
            {
                throw new InvalidOperationException("Dia da semana inválido.");
            }

            if (hour.IsOpen)
            {
                ValidateTimeRange(hour.StartTime ?? "", hour.EndTime ?? "");
            }
        }
    }

    private static void ValidateProfessionalSchedules(IReadOnlyList<ProfessionalScheduleInput> schedules)
    {
        if (schedules.Count == 0)
        {
            throw new InvalidOperationException("Informe a agenda da profissional.");
        }

        foreach (var schedule in schedules)
        {
            if (schedule.DayOfWeek is < 0 or > 6)
            {
                throw new InvalidOperationException("Dia da semana inválido.");
            }

            if (schedule.Active)
            {
                ValidateTimeRange(schedule.StartTime, schedule.EndTime);

                if (!string.IsNullOrWhiteSpace(schedule.BreakStartTime) ||
                    !string.IsNullOrWhiteSpace(schedule.BreakEndTime))
                {
                    ValidateTimeRange(schedule.BreakStartTime ?? "", schedule.BreakEndTime ?? "");
                }
            }
        }
    }

    private static void ValidatePaymentSettings(UpdatePaymentSettingsRequest request)
    {
        if (!request.AllowPix && !request.AllowCreditCard && !request.AllowDebitCard && !request.AllowPayOnSite)
        {
            throw new InvalidOperationException("Habilite pelo menos uma forma de pagamento.");
        }

        if (request.RequirePrePayment && !request.AllowPix && !request.AllowCreditCard && !request.AllowDebitCard)
        {
            throw new InvalidOperationException("Pagamento antecipado exige Pix ou cartão.");
        }

        if (request.ReservationExpirationMinutes is < 2 or > 60)
        {
            throw new InvalidOperationException("A expiração da reserva deve ficar entre 2 e 60 minutos.");
        }

        if (request.ServiceFeePercentage < 0)
        {
            throw new InvalidOperationException("Taxa de serviço não pode ser negativa.");
        }
    }

    private static void ValidateCancellationPolicy(UpdateCancellationPolicyRequest request)
    {
        ValidateRequired(request.PolicyText, "Texto da política");

        if (request.FreeCancelBeforeHours < 0 || request.FreeRescheduleBeforeHours < 0)
        {
            throw new InvalidOperationException("Prazos da política não podem ser negativos.");
        }
    }

    private static void ValidateNotificationSettings(UpdateNotificationSettingsRequest request)
    {
        if (request.ReminderHoursBefore is < 1 or > 168)
        {
            throw new InvalidOperationException("O lembrete deve ficar entre 1 e 168 horas.");
        }
    }

    private static void ValidatePaymentMethod(SpacePaymentSettings settings, string paymentMethodId)
    {
        var allowed = paymentMethodId switch
        {
            "pix" => settings.AllowPix,
            "credit_card" => settings.AllowCreditCard,
            "debit_card" => settings.AllowDebitCard,
            "pay_on_site" => settings.AllowPayOnSite,
            _ => false
        };

        if (!allowed)
        {
            throw new InvalidOperationException("Forma de pagamento não aceita pelo espaço.");
        }

        if (settings.RequirePrePayment && paymentMethodId == "pay_on_site")
        {
            throw new InvalidOperationException("Este espaço exige pagamento antecipado.");
        }
    }

    private static void ValidateSpaceFields(
        string name,
        string category,
        string phone,
        string address,
        string neighborhood,
        string city,
        string state)
    {
        ValidateRequired(name, "Nome do espaço");
        ValidateRequired(category, "Categoria");
        ValidateRequired(phone, "Telefone");
        ValidateRequired(address, "Endereço");
        ValidateRequired(neighborhood, "Bairro");
        ValidateRequired(city, "Cidade");
        ValidateRequired(state, "UF");
    }

    private static void ValidateDate(string date)
    {
        if (!DateOnly.TryParse(date, out _))
        {
            throw new InvalidOperationException("Data inválida.");
        }
    }

    private static void ValidateCoordinates(double? latitude, double? longitude)
    {
        if (latitude.HasValue != longitude.HasValue)
        {
            throw new InvalidOperationException("Latitude e longitude devem ser informadas juntas.");
        }

        ValidateSearchCoordinates(latitude, longitude);
    }

    private static void ValidateSearchCoordinates(double? latitude, double? longitude)
    {
        if (latitude.HasValue && (latitude.Value < -90 || latitude.Value > 90))
        {
            throw new InvalidOperationException("Latitude inválida.");
        }

        if (longitude.HasValue && (longitude.Value < -180 || longitude.Value > 180))
        {
            throw new InvalidOperationException("Longitude inválida.");
        }
    }

    private static double CalculateDistanceKm(
        double originLatitude,
        double originLongitude,
        double destinationLatitude,
        double destinationLongitude)
    {
        const double earthRadiusKm = 6371;
        var latitudeDelta = DegreesToRadians(destinationLatitude - originLatitude);
        var longitudeDelta = DegreesToRadians(destinationLongitude - originLongitude);
        var originLatitudeRadians = DegreesToRadians(originLatitude);
        var destinationLatitudeRadians = DegreesToRadians(destinationLatitude);

        var haversine =
            Math.Sin(latitudeDelta / 2) * Math.Sin(latitudeDelta / 2) +
            Math.Cos(originLatitudeRadians) *
            Math.Cos(destinationLatitudeRadians) *
            Math.Sin(longitudeDelta / 2) *
            Math.Sin(longitudeDelta / 2);

        return Math.Round(earthRadiusKm * 2 * Math.Atan2(Math.Sqrt(haversine), Math.Sqrt(1 - haversine)), 1);
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * Math.PI / 180;
    }

    private static void ValidateTimeRange(string startTime, string endTime)
    {
        if (!IsTime(startTime) || !IsTime(endTime) || MinutesFromTime(startTime) >= MinutesFromTime(endTime))
        {
            throw new InvalidOperationException("Horário inicial e final inválidos.");
        }
    }

    private static bool IsTime(string value)
    {
        return TimeOnly.TryParse(value, out _);
    }

    private static void ValidateRequired(string value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{fieldName} é obrigatório.");
        }
    }

    private static string? NormalizeOptionalEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    }

    private void EnsureAppointmentCanChange(Appointment appointment)
    {
        if (appointment.Status is AppointmentStatus.Cancelled or AppointmentStatus.Expired or AppointmentStatus.Completed or AppointmentStatus.NoShow)
        {
            throw new InvalidOperationException("Este agendamento não pode mais ser alterado.");
        }

        if (appointment.StartDateTime.DateTime <= LocalNow())
        {
            throw new InvalidOperationException("Agendamentos passados não podem ser alterados pela cliente.");
        }
    }

    private static void EnsureAppointmentCanClose(Appointment appointment)
    {
        if (appointment.Status is AppointmentStatus.Cancelled or AppointmentStatus.Expired)
        {
            throw new InvalidOperationException("Agendamentos cancelados ou expirados não podem ser finalizados.");
        }

        if (appointment.Status is AppointmentStatus.Completed or AppointmentStatus.NoShow)
        {
            throw new InvalidOperationException("Este agendamento já foi finalizado.");
        }

        if (appointment.Status is AppointmentStatus.PendingConfirmation)
        {
            throw new InvalidOperationException("Confirme o agendamento antes de finalizar.");
        }
    }

    private bool IsInsidePolicyWindow(DateTimeOffset startDateTime, int freeBeforeHours)
    {
        return startDateTime.DateTime <= LocalNow().AddHours(freeBeforeHours);
    }

    private static SpaceDto ToDto(Space space)
    {
        return new SpaceDto(
            space.Id,
            space.Name,
            space.Description,
            space.Category,
            space.Phone,
            space.Whatsapp,
            space.Address,
            space.Neighborhood,
            space.City,
            space.State,
            space.ZipCode,
            space.Latitude,
            space.Longitude,
            space.Active,
            space.Published,
            space.OnboardingCompleted,
            space.AllowOnlineBooking,
            space.RequireManualApproval);
    }

    private static SpaceBookingSettingsDto ToBookingSettingsDto(Space space)
    {
        return new SpaceBookingSettingsDto(
            space.AllowOnlineBooking,
            space.RequireManualApproval);
    }

    private static ServiceCategoryDto ToDto(ServiceCategory category)
    {
        return new ServiceCategoryDto(category.Id, category.SpaceId, category.Name, category.Active);
    }

    private static ServiceDto ToDto(Service service)
    {
        return new ServiceDto(
            service.Id,
            service.SpaceId,
            service.Name,
            service.Description,
            service.Category,
            service.Price,
            service.DurationMinutes,
            service.BufferAfterMinutes,
            service.Active,
            service.OnlineBooking);
    }

    private static ProfessionalDto ToDto(Professional professional)
    {
        return new ProfessionalDto(
            professional.Id,
            professional.SpaceId,
            professional.Name,
            professional.Email,
            professional.Specialty,
            professional.ExperienceYears,
            professional.ProfessionalServices.Select(item => item.ServiceId).ToList(),
            professional.Active);
    }

    private static OpeningHourDto ToDto(SpaceOpeningHour hour)
    {
        return new OpeningHourDto(hour.Id, hour.SpaceId, hour.DayOfWeek, hour.IsOpen, hour.StartTime, hour.EndTime);
    }

    private static ProfessionalScheduleDto ToDto(ProfessionalSchedule schedule)
    {
        return new ProfessionalScheduleDto(
            schedule.Id,
            schedule.ProfessionalId,
            schedule.DayOfWeek,
            schedule.StartTime,
            schedule.EndTime,
            schedule.BreakStartTime,
            schedule.BreakEndTime,
            schedule.Active);
    }

    private static BlockedTimeDto ToDto(BlockedTime blockedTime)
    {
        return new BlockedTimeDto(
            blockedTime.Id,
            blockedTime.SpaceId,
            blockedTime.ProfessionalId,
            blockedTime.Date,
            blockedTime.StartTime,
            blockedTime.EndTime,
            blockedTime.Reason,
            blockedTime.Active);
    }

    private static SpacePaymentSettingsDto ToDto(SpacePaymentSettings settings)
    {
        return new SpacePaymentSettingsDto(
            settings.AllowPix,
            settings.AllowCreditCard,
            settings.AllowDebitCard,
            settings.AllowPayOnSite,
            settings.RequirePrePayment,
            settings.RequireDeposit,
            settings.DepositType,
            settings.DepositValue,
            settings.ServiceFeePercentage,
            settings.ReservationExpirationMinutes);
    }

    private static SpaceCancellationPolicyDto ToDto(SpaceCancellationPolicy policy)
    {
        return new SpaceCancellationPolicyDto(
            policy.AllowCustomerCancel,
            policy.FreeCancelBeforeHours,
            policy.AllowReschedule,
            policy.FreeRescheduleBeforeHours,
            policy.ChargeLateCancelFee,
            policy.LateCancelFee,
            policy.PolicyText);
    }

    private static SpacePhotoDto ToDto(SpacePhoto photo)
    {
        return new SpacePhotoDto(
            photo.Id,
            photo.SpaceId,
            photo.Url,
            photo.Caption,
            photo.SortOrder,
            photo.Active,
            photo.CreatedAt);
    }

    private static SpaceNotificationSettingsDto ToDto(SpaceNotificationSettings settings)
    {
        return new SpaceNotificationSettingsDto(
            settings.NotifyCustomerOnBooking,
            settings.NotifyCustomerOnCancel,
            settings.NotifyCustomerOnReschedule,
            settings.NotifyOwnerOnBooking,
            settings.NotifyProfessionalOnBooking,
            settings.ReminderHoursBefore,
            settings.Active);
    }

    private static NotificationDto ToDto(Notification notification)
    {
        return new NotificationDto(
            notification.Id,
            notification.UserId,
            notification.SpaceId,
            notification.AppointmentId,
            notification.Title,
            notification.Message,
            notification.Read,
            notification.CreatedAt);
    }

    private static ReviewDto ToDto(Review review)
    {
        return new ReviewDto(
            review.Id,
            review.AppointmentId,
            review.SpaceId,
            review.CustomerId,
            review.Rating,
            review.Comment,
            review.CreatedAt);
    }

    private static AppointmentDto ToDto(Appointment appointment)
    {
        return new AppointmentDto(
            appointment.Id,
            appointment.Code,
            appointment.CustomerId,
            appointment.SpaceId,
            appointment.ProfessionalId,
            appointment.AnyProfessional,
            appointment.AppointmentServices.Select(service => service.ServiceId).ToList(),
            appointment.StartDateTime,
            appointment.EndDateTime,
            appointment.TotalDurationMinutes,
            appointment.Subtotal,
            appointment.ServiceFee,
            appointment.Total,
            ToSnakeCase(appointment.Status.ToString()),
            appointment.PaymentMethodId,
            ToSnakeCase(appointment.PaymentStatus.ToString()),
            appointment.CreatedAt,
            appointment.ExpiresAt);
    }

    private static AppointmentDetailsDto ToDetailsDto(Appointment appointment)
    {
        if (appointment.Space is null || appointment.Professional is null)
        {
            throw new InvalidOperationException("Agendamento sem dados relacionados.");
        }

        var services = appointment.AppointmentServices
            .Select(item => item.Service)
            .Where(service => service is not null)
            .Select(service => ToDto(service!))
            .ToList();

        return new AppointmentDetailsDto(
            ToDto(appointment),
            ToDto(appointment.Space),
            ToDto(appointment.Professional),
            services,
            appointment.Review is null ? null : ToDto(appointment.Review));
    }

    private static bool HasValue(string value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }

    private static int MinutesFromTime(string time)
    {
        var parts = time.Split(':');
        return int.Parse(parts[0]) * 60 + int.Parse(parts[1]);
    }

    private static string TimeFromMinutes(int minutes)
    {
        var hours = minutes / 60;
        var remainingMinutes = minutes % 60;
        return $"{hours:00}:{remainingMinutes:00}";
    }

    private static DateTimeOffset ToDateTimeOffset(string date, string time)
    {
        var parsedDate = DateOnly.Parse(date);
        var parsedTime = TimeOnly.Parse(time);

        return new DateTimeOffset(parsedDate.ToDateTime(parsedTime), TimeSpan.Zero);
    }

    private bool IsPastLocalSlot(string date, string startTime)
    {
        var parsedDate = DateOnly.Parse(date);
        var parsedTime = TimeOnly.Parse(startTime);

        return parsedDate.ToDateTime(parsedTime) <= LocalNow();
    }

    private DateTime LocalNow()
    {
        var utcNow = DateTimeOffset.UtcNow;

        return businessTimeZone is null
            ? utcNow.ToOffset(fallbackBusinessTimeOffset).DateTime
            : TimeZoneInfo.ConvertTime(utcNow, businessTimeZone).DateTime;
    }

    private static TimeZoneInfo? ResolveBusinessTimeZone(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return null;
        }
        catch (InvalidTimeZoneException)
        {
            return null;
        }
    }

    private static bool OverlapsBreak(
        int startMinute,
        int endMinute,
        string? breakStartTime,
        string? breakEndTime)
    {
        if (string.IsNullOrWhiteSpace(breakStartTime) || string.IsNullOrWhiteSpace(breakEndTime))
        {
            return false;
        }

        return startMinute < MinutesFromTime(breakEndTime) && endMinute > MinutesFromTime(breakStartTime);
    }

    private static bool OverlapsBlock(
        IEnumerable<BlockedTime> blockedTimes,
        Guid professionalId,
        string startTime,
        string endTime)
    {
        var startMinute = MinutesFromTime(startTime);
        var endMinute = MinutesFromTime(endTime);

        return blockedTimes.Any(block =>
            (block.ProfessionalId is null || block.ProfessionalId == professionalId) &&
            startMinute < MinutesFromTime(block.EndTime) &&
            endMinute > MinutesFromTime(block.StartTime));
    }

    private static bool OverlapsAppointment(
        IEnumerable<Appointment> appointments,
        Guid professionalId,
        string date,
        string startTime,
        string endTime)
    {
        var startDateTime = ToDateTimeOffset(date, startTime);
        var endDateTime = ToDateTimeOffset(date, endTime);

        return appointments.Any(appointment =>
            appointment.ProfessionalId == professionalId &&
            startDateTime < appointment.EndDateTime &&
            endDateTime > appointment.StartDateTime);
    }

    private static string ToSnakeCase(string value)
    {
        return string.Concat(value.Select((character, index) =>
            index > 0 && char.IsUpper(character)
                ? "_" + char.ToLowerInvariant(character)
                : char.ToLowerInvariant(character).ToString()));
    }
}
