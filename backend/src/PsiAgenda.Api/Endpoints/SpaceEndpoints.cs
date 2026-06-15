using Microsoft.AspNetCore.RateLimiting;
using PsiAgenda.Application.Common;
using PsiAgenda.Application.Spaces;

namespace PsiAgenda.Api.Endpoints;

public static class SpaceEndpoints
{
    private const long MaxSpacePhotoUploadBytes = 8 * 1024 * 1024;

    private static readonly Dictionary<string, string> PhotoContentTypeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/jpg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp"
    };

    private static readonly HashSet<string> PhotoFileExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    public static IEndpointRouteBuilder MapSpaceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/spaces")
            .WithTags("Spaces")
            .RequireAuthorization();

        group.MapPost("/", CreateSpaceAsync);
        group.MapPut("/{spaceId:guid}", UpdateSpaceAsync);
        group.MapGet("/my", GetMySpacesAsync);
        group.MapPost("/{spaceId:guid}/starter-setup", CompleteStarterSetupAsync);
        group.MapGet("/{spaceId:guid}/onboarding-checklist", GetOnboardingChecklistAsync);
        group.MapGet("/{spaceId:guid}/dashboard", GetDashboardAsync);
        group.MapGet("/{spaceId:guid}/categories", GetServiceCategoriesAsync);
        group.MapPost("/{spaceId:guid}/categories", CreateServiceCategoryAsync);
        group.MapGet("/{spaceId:guid}/services", GetServicesAsync);
        group.MapPost("/{spaceId:guid}/services", CreateServiceAsync);
        group.MapPut("/{spaceId:guid}/services/{serviceId:guid}", UpdateServiceAsync);
        group.MapGet("/{spaceId:guid}/professionals", GetProfessionalsAsync);
        group.MapPost("/{spaceId:guid}/professionals", CreateProfessionalAsync);
        group.MapPut("/{spaceId:guid}/professionals/{professionalId:guid}", UpdateProfessionalAsync);
        group.MapGet("/{spaceId:guid}/opening-hours", GetOpeningHoursAsync);
        group.MapPut("/{spaceId:guid}/opening-hours", UpdateOpeningHoursAsync);
        group.MapGet("/{spaceId:guid}/professionals/{professionalId:guid}/schedule", GetProfessionalScheduleAsync);
        group.MapPut("/{spaceId:guid}/professionals/{professionalId:guid}/schedule", UpdateProfessionalScheduleAsync);
        group.MapGet("/{spaceId:guid}/blocked-times", GetBlockedTimesAsync);
        group.MapPost("/{spaceId:guid}/blocked-times", CreateBlockedTimeAsync);
        group.MapDelete("/{spaceId:guid}/blocked-times/{blockedTimeId:guid}", DeleteBlockedTimeAsync);
        group.MapGet("/{spaceId:guid}/booking-settings", GetBookingSettingsAsync);
        group.MapPut("/{spaceId:guid}/booking-settings", UpdateBookingSettingsAsync);
        group.MapGet("/{spaceId:guid}/payment-settings", GetPaymentSettingsAsync);
        group.MapPut("/{spaceId:guid}/payment-settings", UpdatePaymentSettingsAsync);
        group.MapGet("/{spaceId:guid}/cancellation-policy", GetCancellationPolicyAsync);
        group.MapPut("/{spaceId:guid}/cancellation-policy", UpdateCancellationPolicyAsync);
        group.MapGet("/{spaceId:guid}/appointments", GetSpaceAppointmentsAsync);
        group.MapGet("/{spaceId:guid}/appointments/{appointmentId:guid}", GetSpaceAppointmentDetailsAsync);
        group.MapPost("/{spaceId:guid}/appointments/{appointmentId:guid}/confirm", ConfirmSpaceAppointmentAsync);
        group.MapPost("/{spaceId:guid}/appointments/{appointmentId:guid}/reject", RejectSpaceAppointmentAsync);
        group.MapPost("/{spaceId:guid}/appointments/{appointmentId:guid}/complete", CompleteSpaceAppointmentAsync);
        group.MapPost("/{spaceId:guid}/appointments/{appointmentId:guid}/no-show", MarkSpaceAppointmentNoShowAsync);
        group.MapGet("/{spaceId:guid}/photos", GetSpacePhotosAsync);
        group.MapPost("/{spaceId:guid}/photos", CreateSpacePhotoAsync);
        group.MapPost("/{spaceId:guid}/photos/upload", UploadSpacePhotoAsync)
            .DisableAntiforgery();
        group.MapDelete("/{spaceId:guid}/photos/{photoId:guid}", DeleteSpacePhotoAsync);
        group.MapGet("/{spaceId:guid}/notification-settings", GetNotificationSettingsAsync);
        group.MapPut("/{spaceId:guid}/notification-settings", UpdateNotificationSettingsAsync);

        var publicGroup = app.MapGroup("/api/public/spaces")
            .WithTags("Public Spaces");
        publicGroup.MapGet("/", GetPublishedSpacesAsync);
        publicGroup.MapGet("/{spaceId:guid}", GetPublishedSpaceDetailsAsync);
        publicGroup.MapGet("/{spaceId:guid}/professionals/compatible", GetCompatibleProfessionalsAsync);

        app.MapPost("/availability/search", SearchAvailabilityAsync)
            .WithTags("Availability");
        app.MapPost("/appointments/reserve", ReserveAppointmentAsync)
            .WithTags("Appointments")
            .RequireAuthorization()
            .RequireRateLimiting("Sensitive");
        app.MapGet("/customers/me/appointments", GetCustomerAppointmentsAsync)
            .WithTags("Appointments")
            .RequireAuthorization();
        app.MapGet("/customers/me/appointments/{appointmentId:guid}", GetCustomerAppointmentDetailsAsync)
            .WithTags("Appointments")
            .RequireAuthorization();
        app.MapPost("/customers/me/appointments/{appointmentId:guid}/cancel", CancelCustomerAppointmentAsync)
            .WithTags("Appointments")
            .RequireAuthorization()
            .RequireRateLimiting("Sensitive");
        app.MapPost("/customers/me/appointments/{appointmentId:guid}/reschedule", RescheduleCustomerAppointmentAsync)
            .WithTags("Appointments")
            .RequireAuthorization()
            .RequireRateLimiting("Sensitive");
        app.MapPost("/customers/me/appointments/{appointmentId:guid}/review", CreateAppointmentReviewAsync)
            .WithTags("Appointments")
            .RequireAuthorization()
            .RequireRateLimiting("Sensitive");
        app.MapGet("/professionals/me/appointments", GetProfessionalAppointmentsAsync)
            .WithTags("Professional")
            .RequireAuthorization();
        app.MapGet("/professionals/me/appointments/{appointmentId:guid}", GetProfessionalAppointmentDetailsAsync)
            .WithTags("Professional")
            .RequireAuthorization();
        app.MapPost("/professionals/me/appointments/{appointmentId:guid}/complete", CompleteProfessionalAppointmentAsync)
            .WithTags("Professional")
            .RequireAuthorization();
        app.MapPost("/professionals/me/appointments/{appointmentId:guid}/no-show", MarkProfessionalAppointmentNoShowAsync)
            .WithTags("Professional")
            .RequireAuthorization();
        app.MapPost("/professionals/me/blocked-times", CreateProfessionalBlockedTimeAsync)
            .WithTags("Professional")
            .RequireAuthorization();
        app.MapGet("/notifications", GetMyNotificationsAsync)
            .WithTags("Notifications")
            .RequireAuthorization();
        app.MapPost("/notifications/{notificationId:guid}/read", MarkNotificationReadAsync)
            .WithTags("Notifications")
            .RequireAuthorization();

        return app;
    }

    private static async Task<IResult> CreateSpaceAsync(
        CreateSpaceRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateSpaceAsync(currentUser.UserIdOrThrow(), request, cancellationToken),
            space => Results.Created($"/spaces/{space.Id}", space));
    }

    private static async Task<IResult> GetMySpacesAsync(
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return Results.Ok(await spaceService.GetMySpacesAsync(currentUser.UserIdOrThrow(), cancellationToken));
    }

    private static async Task<IResult> UpdateSpaceAsync(
        Guid spaceId,
        UpdateSpaceRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateSpaceAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetOnboardingChecklistAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetOnboardingChecklistAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CompleteStarterSetupAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CompleteStarterSetupAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetDashboardAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetOwnerDashboardAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetServiceCategoriesAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetServiceCategoriesAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateServiceCategoryAsync(
        Guid spaceId,
        UpsertServiceCategoryRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateServiceCategoryAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            category => Results.Created($"/spaces/{spaceId}/categories/{category.Id}", category));
    }

    private static async Task<IResult> GetServicesAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetServicesAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateServiceAsync(
        Guid spaceId,
        UpsertServiceRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateServiceAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            service => Results.Created($"/spaces/{spaceId}/services/{service.Id}", service));
    }

    private static async Task<IResult> UpdateServiceAsync(
        Guid spaceId,
        Guid serviceId,
        UpsertServiceRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateServiceAsync(currentUser.UserIdOrThrow(), spaceId, serviceId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetProfessionalsAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetProfessionalsAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateProfessionalAsync(
        Guid spaceId,
        UpsertProfessionalRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateProfessionalAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            professional => Results.Created($"/spaces/{spaceId}/professionals/{professional.Id}", professional));
    }

    private static async Task<IResult> UpdateProfessionalAsync(
        Guid spaceId,
        Guid professionalId,
        UpsertProfessionalRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateProfessionalAsync(currentUser.UserIdOrThrow(), spaceId, professionalId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetOpeningHoursAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetOpeningHoursAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdateOpeningHoursAsync(
        Guid spaceId,
        UpdateOpeningHoursRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateOpeningHoursAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetProfessionalScheduleAsync(
        Guid spaceId,
        Guid professionalId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetProfessionalScheduleAsync(currentUser.UserIdOrThrow(), spaceId, professionalId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdateProfessionalScheduleAsync(
        Guid spaceId,
        Guid professionalId,
        UpdateProfessionalScheduleRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateProfessionalScheduleAsync(currentUser.UserIdOrThrow(), spaceId, professionalId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetBlockedTimesAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetBlockedTimesAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateBlockedTimeAsync(
        Guid spaceId,
        CreateBlockedTimeRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateBlockedTimeAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            block => Results.Created($"/spaces/{spaceId}/blocked-times/{block.Id}", block));
    }

    private static async Task<IResult> DeleteBlockedTimeAsync(
        Guid spaceId,
        Guid blockedTimeId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            async () =>
            {
                await spaceService.DeleteBlockedTimeAsync(currentUser.UserIdOrThrow(), spaceId, blockedTimeId, cancellationToken);
                return true;
            },
            _ => Results.NoContent());
    }

    private static async Task<IResult> GetPaymentSettingsAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetPaymentSettingsAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetBookingSettingsAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetBookingSettingsAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdateBookingSettingsAsync(
        Guid spaceId,
        UpdateSpaceBookingSettingsRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateBookingSettingsAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdatePaymentSettingsAsync(
        Guid spaceId,
        UpdatePaymentSettingsRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdatePaymentSettingsAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetCancellationPolicyAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetCancellationPolicyAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdateCancellationPolicyAsync(
        Guid spaceId,
        UpdateCancellationPolicyRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateCancellationPolicyAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetSpaceAppointmentsAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetSpaceAppointmentsAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetSpaceAppointmentDetailsAsync(
        Guid spaceId,
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetSpaceAppointmentDetailsAsync(currentUser.UserIdOrThrow(), spaceId, appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ConfirmSpaceAppointmentAsync(
        Guid spaceId,
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.ConfirmSpaceAppointmentAsync(currentUser.UserIdOrThrow(), spaceId, appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> RejectSpaceAppointmentAsync(
        Guid spaceId,
        Guid appointmentId,
        RejectAppointmentRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.RejectSpaceAppointmentAsync(currentUser.UserIdOrThrow(), spaceId, appointmentId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CompleteSpaceAppointmentAsync(
        Guid spaceId,
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CompleteSpaceAppointmentAsync(currentUser.UserIdOrThrow(), spaceId, appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> MarkSpaceAppointmentNoShowAsync(
        Guid spaceId,
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.MarkSpaceAppointmentNoShowAsync(currentUser.UserIdOrThrow(), spaceId, appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetSpacePhotosAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetSpacePhotosAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateSpacePhotoAsync(
        Guid spaceId,
        UpsertSpacePhotoRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateSpacePhotoAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            photo => Results.Created($"/spaces/{spaceId}/photos/{photo.Id}", photo));
    }

    private static async Task<IResult> UploadSpacePhotoAsync(
        Guid spaceId,
        HttpRequest request,
        IWebHostEnvironment environment,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            async () =>
            {
                if (!request.HasFormContentType)
                {
                    throw new InvalidOperationException("Envie a foto em multipart/form-data.");
                }

                var userId = currentUser.UserIdOrThrow();
                await spaceService.GetSpacePhotosAsync(userId, spaceId, cancellationToken);

                var form = await request.ReadFormAsync(cancellationToken);
                var file = form.Files.GetFile("file");

                if (file is null || file.Length == 0)
                {
                    throw new InvalidOperationException("Selecione uma foto para enviar.");
                }

                if (file.Length > MaxSpacePhotoUploadBytes)
                {
                    throw new InvalidOperationException("A foto deve ter ate 8 MB.");
                }

                var extension = GetPhotoExtension(file);

                if (extension is null)
                {
                    throw new InvalidOperationException("Envie uma foto JPG, PNG ou WEBP.");
                }

                var webRootPath = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
                var uploadDirectory = Path.Combine(webRootPath, "uploads", "spaces", spaceId.ToString("N"));
                Directory.CreateDirectory(uploadDirectory);

                var fileName = $"{Guid.NewGuid():N}{extension}";
                var filePath = Path.Combine(uploadDirectory, fileName);
                var publicPath = $"/uploads/spaces/{spaceId:N}/{fileName}";
                var publicUrl = BuildPublicFileUrl(request, publicPath);

                try
                {
                    await using (var stream = File.Create(filePath))
                    {
                        await file.CopyToAsync(stream, cancellationToken);
                    }

                    var sortOrder = int.TryParse(form["sortOrder"].ToString(), out var parsedSortOrder)
                        ? parsedSortOrder
                        : 1;
                    var active = !bool.TryParse(form["active"].ToString(), out var parsedActive) || parsedActive;
                    var caption = form["caption"].ToString();

                    return await spaceService.CreateSpacePhotoAsync(
                        userId,
                        spaceId,
                        new UpsertSpacePhotoRequest(publicUrl, caption, sortOrder, active),
                        cancellationToken);
                }
                catch
                {
                    if (File.Exists(filePath))
                    {
                        File.Delete(filePath);
                    }

                    throw;
                }
            },
            photo => Results.Created($"/spaces/{spaceId}/photos/{photo.Id}", photo));
    }

    private static async Task<IResult> DeleteSpacePhotoAsync(
        Guid spaceId,
        Guid photoId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            async () =>
            {
                await spaceService.DeleteSpacePhotoAsync(currentUser.UserIdOrThrow(), spaceId, photoId, cancellationToken);
                return true;
            },
            _ => Results.NoContent());
    }

    private static async Task<IResult> GetNotificationSettingsAsync(
        Guid spaceId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetNotificationSettingsAsync(currentUser.UserIdOrThrow(), spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> UpdateNotificationSettingsAsync(
        Guid spaceId,
        UpdateNotificationSettingsRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.UpdateNotificationSettingsAsync(currentUser.UserIdOrThrow(), spaceId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetPublishedSpacesAsync(
        ISpaceService spaceService,
        double? latitude,
        double? longitude,
        CancellationToken cancellationToken)
    {
        return Results.Ok(await spaceService.GetPublishedSpacesAsync(latitude, longitude, cancellationToken));
    }

    private static async Task<IResult> GetPublishedSpaceDetailsAsync(
        Guid spaceId,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetPublishedSpaceDetailsAsync(spaceId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetCompatibleProfessionalsAsync(
        Guid spaceId,
        [AsParameters] CompatibleProfessionalsQuery query,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        var serviceIds = query.ServiceIds?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Guid.Parse)
            .ToList() ?? [];

        return await ExecuteAsync(
            () => spaceService.GetCompatibleProfessionalsAsync(spaceId, serviceIds, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> SearchAvailabilityAsync(
        AvailabilitySearchRequest request,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.SearchAvailabilityAsync(request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> ReserveAppointmentAsync(
        ReserveAppointmentRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.ReserveAppointmentAsync(currentUser.UserIdOrThrow(), request, cancellationToken),
            appointment => Results.Created($"/appointments/{appointment.Id}", appointment));
    }

    private static async Task<IResult> GetCustomerAppointmentsAsync(
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetCustomerAppointmentsAsync(currentUser.UserIdOrThrow(), cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetCustomerAppointmentDetailsAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetCustomerAppointmentDetailsAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CancelCustomerAppointmentAsync(
        Guid appointmentId,
        CancelAppointmentRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CancelCustomerAppointmentAsync(currentUser.UserIdOrThrow(), appointmentId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> RescheduleCustomerAppointmentAsync(
        Guid appointmentId,
        RescheduleAppointmentRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.RescheduleCustomerAppointmentAsync(currentUser.UserIdOrThrow(), appointmentId, request, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateAppointmentReviewAsync(
        Guid appointmentId,
        CreateReviewRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateAppointmentReviewAsync(currentUser.UserIdOrThrow(), appointmentId, request, cancellationToken),
            review => Results.Created($"/customers/me/appointments/{appointmentId}/review", review));
    }

    private static async Task<IResult> GetProfessionalAppointmentsAsync(
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetProfessionalAppointmentsAsync(currentUser.UserIdOrThrow(), cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> GetProfessionalAppointmentDetailsAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetProfessionalAppointmentDetailsAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CompleteProfessionalAppointmentAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CompleteProfessionalAppointmentAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> MarkProfessionalAppointmentNoShowAsync(
        Guid appointmentId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.MarkProfessionalAppointmentNoShowAsync(currentUser.UserIdOrThrow(), appointmentId, cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> CreateProfessionalBlockedTimeAsync(
        CreateBlockedTimeRequest request,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.CreateProfessionalBlockedTimeAsync(currentUser.UserIdOrThrow(), request, cancellationToken),
            block => Results.Created($"/professionals/me/blocked-times/{block.Id}", block));
    }

    private static async Task<IResult> GetMyNotificationsAsync(
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            () => spaceService.GetMyNotificationsAsync(currentUser.UserIdOrThrow(), cancellationToken),
            Results.Ok);
    }

    private static async Task<IResult> MarkNotificationReadAsync(
        Guid notificationId,
        ICurrentUserService currentUser,
        ISpaceService spaceService,
        CancellationToken cancellationToken)
    {
        return await ExecuteAsync(
            async () =>
            {
                await spaceService.MarkNotificationReadAsync(currentUser.UserIdOrThrow(), notificationId, cancellationToken);
                return true;
            },
            _ => Results.NoContent());
    }

    private static async Task<IResult> ExecuteAsync<T>(
        Func<Task<T>> action,
        Func<T, IResult> success)
    {
        try
        {
            return success(await action());
        }
        catch (InvalidOperationException exception)
        {
            return Results.BadRequest(new { message = exception.Message });
        }
        catch (KeyNotFoundException exception)
        {
            return Results.NotFound(new { message = exception.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (FormatException)
        {
            return Results.BadRequest(new { message = "Parâmetros inválidos." });
        }
    }
    private static string? GetPhotoExtension(IFormFile file)
    {
        if (PhotoContentTypeExtensions.TryGetValue(file.ContentType, out var extension))
        {
            return extension;
        }

        var fileExtension = Path.GetExtension(file.FileName);

        return PhotoFileExtensions.Contains(fileExtension) ? fileExtension.ToLowerInvariant() : null;
    }

    private static string BuildPublicFileUrl(HttpRequest request, string publicPath)
    {
        var pathBase = request.PathBase.HasValue ? request.PathBase.Value : string.Empty;
        return $"{request.Scheme}://{request.Host}{pathBase}{publicPath}";
    }
}

public sealed record CompatibleProfessionalsQuery(string? ServiceIds);
