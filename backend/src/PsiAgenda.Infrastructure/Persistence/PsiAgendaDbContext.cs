using Microsoft.EntityFrameworkCore;
using PsiAgenda.Domain.Entities;
using PsiAgenda.Domain.Enums;

namespace PsiAgenda.Infrastructure.Persistence;

public sealed class PsiAgendaDbContext(DbContextOptions<PsiAgendaDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Space> Spaces => Set<Space>();
    public DbSet<SpaceUser> SpaceUsers => Set<SpaceUser>();
    public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Professional> Professionals => Set<Professional>();
    public DbSet<ProfessionalService> ProfessionalServices => Set<ProfessionalService>();
    public DbSet<ProfessionalSchedule> ProfessionalSchedules => Set<ProfessionalSchedule>();
    public DbSet<SpaceOpeningHour> SpaceOpeningHours => Set<SpaceOpeningHour>();
    public DbSet<BlockedTime> BlockedTimes => Set<BlockedTime>();
    public DbSet<SpacePaymentSettings> SpacePaymentSettings => Set<SpacePaymentSettings>();
    public DbSet<SpaceCancellationPolicy> SpaceCancellationPolicies => Set<SpaceCancellationPolicy>();
    public DbSet<SpaceNotificationSettings> SpaceNotificationSettings => Set<SpaceNotificationSettings>();
    public DbSet<SpacePhoto> SpacePhotos => Set<SpacePhoto>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentService> AppointmentServices => Set<AppointmentService>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ClinicalDraft> ClinicalDrafts => Set<ClinicalDraft>();
    public DbSet<ClinicalRecord> ClinicalRecords => Set<ClinicalRecord>();
    public DbSet<AppliedClinicalTag> AppliedClinicalTags => Set<AppliedClinicalTag>();
    public DbSet<PatientTimelineItem> PatientTimelineItems => Set<PatientTimelineItem>();
    public DbSet<PatientConsent> PatientConsents => Set<PatientConsent>();
    public DbSet<ClinicalSession> ClinicalSessions => Set<ClinicalSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Id).HasColumnName("id");
            entity.Property(user => user.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(user => user.Email).HasColumnName("email").HasMaxLength(220).IsRequired();
            entity.Property(user => user.Phone).HasColumnName("phone").HasMaxLength(40);
            entity.Property(user => user.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(user => user.Role)
                .HasColumnName("role")
                .HasConversion(
                    role => role.ToString(),
                    value => Enum.Parse<UserRole>(value))
                .HasMaxLength(40)
                .IsRequired();
            entity.Property(user => user.Active).HasColumnName("active");
            entity.Property(user => user.CreatedAt).HasColumnName("created_at");
            entity.Property(user => user.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(user => user.Email).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(token => token.Id);
            entity.Property(token => token.Id).HasColumnName("id");
            entity.Property(token => token.UserId).HasColumnName("user_id");
            entity.Property(token => token.TokenHash).HasColumnName("token_hash").IsRequired();
            entity.Property(token => token.ExpiresAt).HasColumnName("expires_at");
            entity.Property(token => token.CreatedAt).HasColumnName("created_at");
            entity.Property(token => token.RevokedAt).HasColumnName("revoked_at");
            entity.HasIndex(token => token.TokenHash).IsUnique();
            entity.HasOne(token => token.User)
                .WithMany(user => user.RefreshTokens)
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Space>(entity =>
        {
            entity.ToTable("spaces");
            entity.HasKey(space => space.Id);
            entity.Property(space => space.Id).HasColumnName("id");
            entity.Property(space => space.Name).HasColumnName("name").HasMaxLength(180).IsRequired();
            entity.Property(space => space.Description).HasColumnName("description").HasMaxLength(600).IsRequired();
            entity.Property(space => space.Category).HasColumnName("category").HasMaxLength(80).IsRequired();
            entity.Property(space => space.Phone).HasColumnName("phone").HasMaxLength(40).IsRequired();
            entity.Property(space => space.Whatsapp).HasColumnName("whatsapp").HasMaxLength(40).IsRequired();
            entity.Property(space => space.Address).HasColumnName("address").HasMaxLength(240).IsRequired();
            entity.Property(space => space.Neighborhood).HasColumnName("neighborhood").HasMaxLength(120).IsRequired();
            entity.Property(space => space.City).HasColumnName("city").HasMaxLength(120).IsRequired();
            entity.Property(space => space.State).HasColumnName("state").HasMaxLength(2).IsRequired();
            entity.Property(space => space.ZipCode).HasColumnName("zip_code").HasMaxLength(20);
            entity.Property(space => space.Latitude).HasColumnName("latitude");
            entity.Property(space => space.Longitude).HasColumnName("longitude");
            entity.Property(space => space.Active).HasColumnName("active");
            entity.Property(space => space.Published).HasColumnName("published");
            entity.Property(space => space.OnboardingCompleted).HasColumnName("onboarding_completed");
            entity.Property(space => space.AllowOnlineBooking).HasColumnName("allow_online_booking");
            entity.Property(space => space.RequireManualApproval).HasColumnName("require_manual_approval");
            entity.Property(space => space.CreatedAt).HasColumnName("created_at");
            entity.Property(space => space.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<SpaceUser>(entity =>
        {
            entity.ToTable("space_users");
            entity.HasKey(spaceUser => spaceUser.Id);
            entity.Property(spaceUser => spaceUser.Id).HasColumnName("id");
            entity.Property(spaceUser => spaceUser.SpaceId).HasColumnName("space_id");
            entity.Property(spaceUser => spaceUser.UserId).HasColumnName("user_id");
            entity.Property(spaceUser => spaceUser.Role)
                .HasColumnName("role")
                .HasConversion(
                    role => role.ToString(),
                    value => Enum.Parse<SpaceUserRole>(value))
                .HasMaxLength(40)
                .IsRequired();
            entity.Property(spaceUser => spaceUser.Active).HasColumnName("active");
            entity.Property(spaceUser => spaceUser.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(spaceUser => new { spaceUser.SpaceId, spaceUser.UserId }).IsUnique();
            entity.HasOne(spaceUser => spaceUser.Space)
                .WithMany(space => space.SpaceUsers)
                .HasForeignKey(spaceUser => spaceUser.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(spaceUser => spaceUser.User)
                .WithMany(user => user.SpaceUsers)
                .HasForeignKey(spaceUser => spaceUser.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.ToTable("services");
            entity.HasKey(service => service.Id);
            entity.Property(service => service.Id).HasColumnName("id");
            entity.Property(service => service.SpaceId).HasColumnName("space_id");
            entity.Property(service => service.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(service => service.Description).HasColumnName("description").HasMaxLength(400).IsRequired();
            entity.Property(service => service.Category).HasColumnName("category").HasMaxLength(80).IsRequired();
            entity.Property(service => service.Price).HasColumnName("price").HasPrecision(10, 2);
            entity.Property(service => service.DurationMinutes).HasColumnName("duration_minutes");
            entity.Property(service => service.BufferAfterMinutes).HasColumnName("buffer_after_minutes");
            entity.Property(service => service.Active).HasColumnName("active");
            entity.Property(service => service.OnlineBooking).HasColumnName("online_booking");
            entity.Property(service => service.CreatedAt).HasColumnName("created_at");
            entity.Property(service => service.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(service => new { service.SpaceId, service.Active });
            entity.HasOne(service => service.Space)
                .WithMany(space => space.Services)
                .HasForeignKey(service => service.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServiceCategory>(entity =>
        {
            entity.ToTable("service_categories");
            entity.HasKey(category => category.Id);
            entity.Property(category => category.Id).HasColumnName("id");
            entity.Property(category => category.SpaceId).HasColumnName("space_id");
            entity.Property(category => category.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            entity.Property(category => category.Active).HasColumnName("active");
            entity.Property(category => category.CreatedAt).HasColumnName("created_at");
            entity.Property(category => category.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(category => new { category.SpaceId, category.Name }).IsUnique();
            entity.HasOne(category => category.Space)
                .WithMany(space => space.ServiceCategories)
                .HasForeignKey(category => category.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Professional>(entity =>
        {
            entity.ToTable("professionals");
            entity.HasKey(professional => professional.Id);
            entity.Property(professional => professional.Id).HasColumnName("id");
            entity.Property(professional => professional.SpaceId).HasColumnName("space_id");
            entity.Property(professional => professional.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(professional => professional.Email).HasColumnName("email").HasMaxLength(220);
            entity.Property(professional => professional.Specialty).HasColumnName("specialty").HasMaxLength(120).IsRequired();
            entity.Property(professional => professional.ExperienceYears).HasColumnName("experience_years");
            entity.Property(professional => professional.Active).HasColumnName("active");
            entity.Property(professional => professional.CreatedAt).HasColumnName("created_at");
            entity.Property(professional => professional.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(professional => new { professional.SpaceId, professional.Active });
            entity.HasIndex(professional => new { professional.SpaceId, professional.Email }).IsUnique();
            entity.HasOne(professional => professional.Space)
                .WithMany(space => space.Professionals)
                .HasForeignKey(professional => professional.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfessionalService>(entity =>
        {
            entity.ToTable("professional_services");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.ProfessionalId).HasColumnName("professional_id");
            entity.Property(item => item.ServiceId).HasColumnName("service_id");
            entity.Property(item => item.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(item => new { item.ProfessionalId, item.ServiceId }).IsUnique();
            entity.HasOne(item => item.Professional)
                .WithMany(professional => professional.ProfessionalServices)
                .HasForeignKey(item => item.ProfessionalId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Service)
                .WithMany(service => service.ProfessionalServices)
                .HasForeignKey(item => item.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfessionalSchedule>(entity =>
        {
            entity.ToTable("professional_schedules");
            entity.HasKey(schedule => schedule.Id);
            entity.Property(schedule => schedule.Id).HasColumnName("id");
            entity.Property(schedule => schedule.ProfessionalId).HasColumnName("professional_id");
            entity.Property(schedule => schedule.DayOfWeek).HasColumnName("day_of_week");
            entity.Property(schedule => schedule.StartTime).HasColumnName("start_time").HasMaxLength(5).IsRequired();
            entity.Property(schedule => schedule.EndTime).HasColumnName("end_time").HasMaxLength(5).IsRequired();
            entity.Property(schedule => schedule.BreakStartTime).HasColumnName("break_start_time").HasMaxLength(5);
            entity.Property(schedule => schedule.BreakEndTime).HasColumnName("break_end_time").HasMaxLength(5);
            entity.Property(schedule => schedule.Active).HasColumnName("active");
            entity.HasIndex(schedule => new { schedule.ProfessionalId, schedule.DayOfWeek }).IsUnique();
            entity.HasOne(schedule => schedule.Professional)
                .WithMany(professional => professional.Schedules)
                .HasForeignKey(schedule => schedule.ProfessionalId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpaceOpeningHour>(entity =>
        {
            entity.ToTable("space_opening_hours");
            entity.HasKey(hour => hour.Id);
            entity.Property(hour => hour.Id).HasColumnName("id");
            entity.Property(hour => hour.SpaceId).HasColumnName("space_id");
            entity.Property(hour => hour.DayOfWeek).HasColumnName("day_of_week");
            entity.Property(hour => hour.IsOpen).HasColumnName("is_open");
            entity.Property(hour => hour.StartTime).HasColumnName("start_time").HasMaxLength(5);
            entity.Property(hour => hour.EndTime).HasColumnName("end_time").HasMaxLength(5);
            entity.Property(hour => hour.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(hour => new { hour.SpaceId, hour.DayOfWeek }).IsUnique();
            entity.HasOne(hour => hour.Space)
                .WithMany(space => space.OpeningHours)
                .HasForeignKey(hour => hour.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BlockedTime>(entity =>
        {
            entity.ToTable("blocked_times");
            entity.HasKey(block => block.Id);
            entity.Property(block => block.Id).HasColumnName("id");
            entity.Property(block => block.SpaceId).HasColumnName("space_id");
            entity.Property(block => block.ProfessionalId).HasColumnName("professional_id");
            entity.Property(block => block.Date).HasColumnName("date").HasMaxLength(10).IsRequired();
            entity.Property(block => block.StartTime).HasColumnName("start_time").HasMaxLength(5).IsRequired();
            entity.Property(block => block.EndTime).HasColumnName("end_time").HasMaxLength(5).IsRequired();
            entity.Property(block => block.Reason).HasColumnName("reason").HasMaxLength(180).IsRequired();
            entity.Property(block => block.Active).HasColumnName("active");
            entity.Property(block => block.CreatedAt).HasColumnName("created_at");
            entity.Property(block => block.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(block => new { block.SpaceId, block.Date });
            entity.HasOne(block => block.Space)
                .WithMany(space => space.BlockedTimes)
                .HasForeignKey(block => block.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(block => block.Professional)
                .WithMany(professional => professional.BlockedTimes)
                .HasForeignKey(block => block.ProfessionalId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SpacePaymentSettings>(entity =>
        {
            entity.ToTable("space_payment_settings");
            entity.HasKey(settings => settings.Id);
            entity.Property(settings => settings.Id).HasColumnName("id");
            entity.Property(settings => settings.SpaceId).HasColumnName("space_id");
            entity.Property(settings => settings.AllowPix).HasColumnName("allow_pix");
            entity.Property(settings => settings.AllowCreditCard).HasColumnName("allow_credit_card");
            entity.Property(settings => settings.AllowDebitCard).HasColumnName("allow_debit_card");
            entity.Property(settings => settings.AllowPayOnSite).HasColumnName("allow_pay_on_site");
            entity.Property(settings => settings.RequirePrePayment).HasColumnName("require_pre_payment");
            entity.Property(settings => settings.RequireDeposit).HasColumnName("require_deposit");
            entity.Property(settings => settings.DepositType).HasColumnName("deposit_type").HasMaxLength(24);
            entity.Property(settings => settings.DepositValue).HasColumnName("deposit_value").HasPrecision(10, 2);
            entity.Property(settings => settings.ServiceFeePercentage).HasColumnName("service_fee_percentage").HasPrecision(5, 2);
            entity.Property(settings => settings.ReservationExpirationMinutes).HasColumnName("reservation_expiration_minutes");
            entity.Property(settings => settings.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(settings => settings.SpaceId).IsUnique();
            entity.HasOne(settings => settings.Space)
                .WithOne(space => space.PaymentSettings)
                .HasForeignKey<SpacePaymentSettings>(settings => settings.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpaceCancellationPolicy>(entity =>
        {
            entity.ToTable("space_cancellation_policies");
            entity.HasKey(policy => policy.Id);
            entity.Property(policy => policy.Id).HasColumnName("id");
            entity.Property(policy => policy.SpaceId).HasColumnName("space_id");
            entity.Property(policy => policy.AllowCustomerCancel).HasColumnName("allow_customer_cancel");
            entity.Property(policy => policy.FreeCancelBeforeHours).HasColumnName("free_cancel_before_hours");
            entity.Property(policy => policy.AllowReschedule).HasColumnName("allow_reschedule");
            entity.Property(policy => policy.FreeRescheduleBeforeHours).HasColumnName("free_reschedule_before_hours");
            entity.Property(policy => policy.ChargeLateCancelFee).HasColumnName("charge_late_cancel_fee");
            entity.Property(policy => policy.LateCancelFee).HasColumnName("late_cancel_fee").HasPrecision(10, 2);
            entity.Property(policy => policy.PolicyText).HasColumnName("policy_text").HasMaxLength(800).IsRequired();
            entity.Property(policy => policy.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(policy => policy.SpaceId).IsUnique();
            entity.HasOne(policy => policy.Space)
                .WithOne(space => space.CancellationPolicy)
                .HasForeignKey<SpaceCancellationPolicy>(policy => policy.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpaceNotificationSettings>(entity =>
        {
            entity.ToTable("space_notification_settings");
            entity.HasKey(settings => settings.Id);
            entity.Property(settings => settings.Id).HasColumnName("id");
            entity.Property(settings => settings.SpaceId).HasColumnName("space_id");
            entity.Property(settings => settings.NotifyCustomerOnBooking).HasColumnName("notify_customer_on_booking");
            entity.Property(settings => settings.NotifyCustomerOnCancel).HasColumnName("notify_customer_on_cancel");
            entity.Property(settings => settings.NotifyCustomerOnReschedule).HasColumnName("notify_customer_on_reschedule");
            entity.Property(settings => settings.NotifyOwnerOnBooking).HasColumnName("notify_owner_on_booking");
            entity.Property(settings => settings.NotifyProfessionalOnBooking).HasColumnName("notify_professional_on_booking");
            entity.Property(settings => settings.ReminderHoursBefore).HasColumnName("reminder_hours_before");
            entity.Property(settings => settings.Active).HasColumnName("active");
            entity.Property(settings => settings.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(settings => settings.SpaceId).IsUnique();
            entity.HasOne(settings => settings.Space)
                .WithOne(space => space.NotificationSettings)
                .HasForeignKey<SpaceNotificationSettings>(settings => settings.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpacePhoto>(entity =>
        {
            entity.ToTable("space_photos");
            entity.HasKey(photo => photo.Id);
            entity.Property(photo => photo.Id).HasColumnName("id");
            entity.Property(photo => photo.SpaceId).HasColumnName("space_id");
            entity.Property(photo => photo.Url).HasColumnName("url").HasMaxLength(1000).IsRequired();
            entity.Property(photo => photo.Caption).HasColumnName("caption").HasMaxLength(160);
            entity.Property(photo => photo.SortOrder).HasColumnName("sort_order");
            entity.Property(photo => photo.Active).HasColumnName("active");
            entity.Property(photo => photo.CreatedAt).HasColumnName("created_at");
            entity.Property(photo => photo.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(photo => new { photo.SpaceId, photo.SortOrder });
            entity.HasOne(photo => photo.Space)
                .WithMany(space => space.Photos)
                .HasForeignKey(photo => photo.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");
            entity.HasKey(appointment => appointment.Id);
            entity.Property(appointment => appointment.Id).HasColumnName("id");
            entity.Property(appointment => appointment.Code).HasColumnName("code").HasMaxLength(32).IsRequired();
            entity.Property(appointment => appointment.CustomerId).HasColumnName("customer_id");
            entity.Property(appointment => appointment.SpaceId).HasColumnName("space_id");
            entity.Property(appointment => appointment.ProfessionalId).HasColumnName("professional_id");
            entity.Property(appointment => appointment.AnyProfessional).HasColumnName("any_professional");
            entity.Property(appointment => appointment.StartDateTime).HasColumnName("start_date_time");
            entity.Property(appointment => appointment.EndDateTime).HasColumnName("end_date_time");
            entity.Property(appointment => appointment.TotalDurationMinutes).HasColumnName("total_duration_minutes");
            entity.Property(appointment => appointment.Subtotal).HasColumnName("subtotal").HasPrecision(10, 2);
            entity.Property(appointment => appointment.ServiceFee).HasColumnName("service_fee").HasPrecision(10, 2);
            entity.Property(appointment => appointment.Total).HasColumnName("total").HasPrecision(10, 2);
            entity.Property(appointment => appointment.Status)
                .HasColumnName("status")
                .HasConversion(
                    status => status.ToString(),
                    value => Enum.Parse<AppointmentStatus>(value))
                .HasMaxLength(40)
                .IsRequired();
            entity.Property(appointment => appointment.PaymentMethodId).HasColumnName("payment_method_id").HasMaxLength(40).IsRequired();
            entity.Property(appointment => appointment.PaymentStatus)
                .HasColumnName("payment_status")
                .HasConversion(
                    status => status.ToString(),
                    value => Enum.Parse<PaymentStatus>(value))
                .HasMaxLength(40)
                .IsRequired();
            entity.Property(appointment => appointment.CreatedAt).HasColumnName("created_at");
            entity.Property(appointment => appointment.UpdatedAt).HasColumnName("updated_at");
            entity.Property(appointment => appointment.ExpiresAt).HasColumnName("expires_at");
            entity.Property(appointment => appointment.OwnerDecisionReason).HasColumnName("owner_decision_reason").HasMaxLength(500);
            entity.Property(appointment => appointment.OwnerDecisionAt).HasColumnName("owner_decision_at");
            entity.Property(appointment => appointment.OnlineRoomUrl).HasColumnName("online_room_url").HasMaxLength(2048);
            entity.HasIndex(appointment => appointment.Code).IsUnique();
            entity.HasIndex(appointment => new { appointment.SpaceId, appointment.StartDateTime });
            entity.HasIndex(appointment => new { appointment.ProfessionalId, appointment.StartDateTime, appointment.EndDateTime });
            entity.HasOne(appointment => appointment.Customer)
                .WithMany(user => user.Appointments)
                .HasForeignKey(appointment => appointment.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(appointment => appointment.Space)
                .WithMany(space => space.Appointments)
                .HasForeignKey(appointment => appointment.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(appointment => appointment.Professional)
                .WithMany(professional => professional.Appointments)
                .HasForeignKey(appointment => appointment.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AppointmentService>(entity =>
        {
            entity.ToTable("appointment_services");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.AppointmentId).HasColumnName("appointment_id");
            entity.Property(item => item.ServiceId).HasColumnName("service_id");
            entity.Property(item => item.Price).HasColumnName("price").HasPrecision(10, 2);
            entity.Property(item => item.DurationMinutes).HasColumnName("duration_minutes");
            entity.HasIndex(item => new { item.AppointmentId, item.ServiceId }).IsUnique();
            entity.HasOne(item => item.Appointment)
                .WithMany(appointment => appointment.AppointmentServices)
                .HasForeignKey(item => item.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.Service)
                .WithMany(service => service.AppointmentServices)
                .HasForeignKey(item => item.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(notification => notification.Id);
            entity.Property(notification => notification.Id).HasColumnName("id");
            entity.Property(notification => notification.UserId).HasColumnName("user_id");
            entity.Property(notification => notification.SpaceId).HasColumnName("space_id");
            entity.Property(notification => notification.AppointmentId).HasColumnName("appointment_id");
            entity.Property(notification => notification.Title).HasColumnName("title").HasMaxLength(140).IsRequired();
            entity.Property(notification => notification.Message).HasColumnName("message").HasMaxLength(500).IsRequired();
            entity.Property(notification => notification.Read).HasColumnName("read");
            entity.Property(notification => notification.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(notification => new { notification.UserId, notification.CreatedAt });
            entity.HasIndex(notification => new { notification.SpaceId, notification.CreatedAt });
            entity.HasOne(notification => notification.User)
                .WithMany(user => user.Notifications)
                .HasForeignKey(notification => notification.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(notification => notification.Space)
                .WithMany()
                .HasForeignKey(notification => notification.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(notification => notification.Appointment)
                .WithMany(appointment => appointment.Notifications)
                .HasForeignKey(notification => notification.AppointmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(review => review.Id);
            entity.Property(review => review.Id).HasColumnName("id");
            entity.Property(review => review.AppointmentId).HasColumnName("appointment_id");
            entity.Property(review => review.SpaceId).HasColumnName("space_id");
            entity.Property(review => review.CustomerId).HasColumnName("customer_id");
            entity.Property(review => review.Rating).HasColumnName("rating");
            entity.Property(review => review.Comment).HasColumnName("comment").HasMaxLength(700);
            entity.Property(review => review.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(review => review.AppointmentId).IsUnique();
            entity.HasIndex(review => new { review.SpaceId, review.CreatedAt });
            entity.HasOne(review => review.Appointment)
                .WithOne(appointment => appointment.Review)
                .HasForeignKey<Review>(review => review.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(review => review.Space)
                .WithMany(space => space.Reviews)
                .HasForeignKey(review => review.SpaceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(review => review.Customer)
                .WithMany(user => user.Reviews)
                .HasForeignKey(review => review.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(log => log.Id);
            entity.Property(log => log.Id).HasColumnName("id");
            entity.Property(log => log.UserId).HasColumnName("user_id");
            entity.Property(log => log.SpaceId).HasColumnName("space_id");
            entity.Property(log => log.Action).HasColumnName("action").HasMaxLength(120).IsRequired();
            entity.Property(log => log.Entity).HasColumnName("entity").HasMaxLength(120).IsRequired();
            entity.Property(log => log.EntityId).HasColumnName("entity_id").HasMaxLength(80);
            entity.Property(log => log.MetadataJson).HasColumnName("metadata_json").HasColumnType("jsonb");
            entity.Property(log => log.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(log => new { log.SpaceId, log.CreatedAt });
        });

        modelBuilder.Entity<ClinicalDraft>(entity =>
        {
            entity.ToTable("clinical_drafts");
            entity.HasKey(draft => draft.Id);
            entity.Property(draft => draft.Id).HasColumnName("id");
            entity.Property(draft => draft.AppointmentId).HasColumnName("appointment_id");
            entity.Property(draft => draft.PatientId).HasColumnName("patient_id");
            entity.Property(draft => draft.ProfessionalId).HasColumnName("professional_id");
            entity.Property(draft => draft.SpaceId).HasColumnName("space_id");
            entity.Property(draft => draft.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(draft => draft.Status).HasColumnName("status").HasMaxLength(40).IsRequired();
            entity.Property(draft => draft.Source).HasColumnName("source").HasMaxLength(40).IsRequired();
            entity.Property(draft => draft.RecordType).HasColumnName("record_type").HasMaxLength(40).IsRequired();
            entity.Property(draft => draft.PreviousRecordId).HasColumnName("previous_record_id");
            entity.Property(draft => draft.SessionNote).HasColumnName("session_note").HasMaxLength(4000);
            entity.Property(draft => draft.ContentText).HasColumnName("content_text").HasMaxLength(8000).IsRequired();
            entity.Property(draft => draft.TagsJson).HasColumnName("tags_json").HasColumnType("jsonb");
            entity.Property(draft => draft.AiGenerated).HasColumnName("ai_generated");
            entity.Property(draft => draft.CreatedAt).HasColumnName("created_at");
            entity.Property(draft => draft.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(draft => new { draft.AppointmentId, draft.CreatedAt });
            entity.HasIndex(draft => new { draft.PatientId, draft.ProfessionalId });
            entity.HasIndex(draft => draft.PreviousRecordId);
            entity.HasOne(draft => draft.Appointment)
                .WithMany()
                .HasForeignKey(draft => draft.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(draft => draft.Patient)
                .WithMany()
                .HasForeignKey(draft => draft.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(draft => draft.Professional)
                .WithMany()
                .HasForeignKey(draft => draft.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(draft => draft.Space)
                .WithMany()
                .HasForeignKey(draft => draft.SpaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(draft => draft.CreatedBy)
                .WithMany()
                .HasForeignKey(draft => draft.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(draft => draft.PreviousRecord)
                .WithMany()
                .HasForeignKey(draft => draft.PreviousRecordId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AppliedClinicalTag>(entity =>
        {
            entity.ToTable("applied_clinical_tags");
            entity.HasKey(tag => tag.Id);
            entity.Property(tag => tag.Id).HasColumnName("id");
            entity.Property(tag => tag.AppointmentId).HasColumnName("appointment_id");
            entity.Property(tag => tag.PatientId).HasColumnName("patient_id");
            entity.Property(tag => tag.ProfessionalId).HasColumnName("professional_id");
            entity.Property(tag => tag.SpaceId).HasColumnName("space_id");
            entity.Property(tag => tag.AppliedByUserId).HasColumnName("applied_by_user_id");
            entity.Property(tag => tag.Label).HasColumnName("label").HasMaxLength(80).IsRequired();
            entity.Property(tag => tag.Tone).HasColumnName("tone").HasMaxLength(20).IsRequired();
            entity.Property(tag => tag.Note).HasColumnName("note").HasMaxLength(500);
            entity.Property(tag => tag.AppliedAt).HasColumnName("applied_at");
            entity.HasIndex(tag => new { tag.AppointmentId, tag.Label });
            entity.HasIndex(tag => new { tag.PatientId, tag.ProfessionalId });
            entity.HasOne(tag => tag.Appointment)
                .WithMany()
                .HasForeignKey(tag => tag.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(tag => tag.Patient)
                .WithMany()
                .HasForeignKey(tag => tag.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(tag => tag.Professional)
                .WithMany()
                .HasForeignKey(tag => tag.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(tag => tag.Space)
                .WithMany()
                .HasForeignKey(tag => tag.SpaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(tag => tag.AppliedBy)
                .WithMany()
                .HasForeignKey(tag => tag.AppliedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClinicalRecord>(entity =>
        {
            entity.ToTable("clinical_records");
            entity.HasKey(record => record.Id);
            entity.Property(record => record.Id).HasColumnName("id");
            entity.Property(record => record.AppointmentId).HasColumnName("appointment_id");
            entity.Property(record => record.DraftId).HasColumnName("draft_id");
            entity.Property(record => record.PatientId).HasColumnName("patient_id");
            entity.Property(record => record.ProfessionalId).HasColumnName("professional_id");
            entity.Property(record => record.SpaceId).HasColumnName("space_id");
            entity.Property(record => record.ApprovedByUserId).HasColumnName("approved_by_user_id");
            entity.Property(record => record.RecordType).HasColumnName("record_type").HasMaxLength(40).IsRequired();
            entity.Property(record => record.Status).HasColumnName("status").HasMaxLength(40).IsRequired();
            entity.Property(record => record.ContentText).HasColumnName("content_text").HasMaxLength(8000).IsRequired();
            entity.Property(record => record.TagsJson).HasColumnName("tags_json").HasColumnType("jsonb");
            entity.Property(record => record.Version).HasColumnName("version");
            entity.Property(record => record.PreviousRecordId).HasColumnName("previous_record_id");
            entity.Property(record => record.ApprovedAt).HasColumnName("approved_at");
            entity.Property(record => record.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(record => new { record.PatientId, record.ProfessionalId, record.Version }).IsUnique();
            entity.HasIndex(record => new { record.AppointmentId, record.ApprovedAt });
            entity.HasOne(record => record.Appointment)
                .WithMany()
                .HasForeignKey(record => record.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(record => record.Draft)
                .WithMany()
                .HasForeignKey(record => record.DraftId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(record => record.Patient)
                .WithMany()
                .HasForeignKey(record => record.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(record => record.Professional)
                .WithMany()
                .HasForeignKey(record => record.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(record => record.Space)
                .WithMany()
                .HasForeignKey(record => record.SpaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(record => record.ApprovedBy)
                .WithMany()
                .HasForeignKey(record => record.ApprovedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(record => record.PreviousRecord)
                .WithMany()
                .HasForeignKey(record => record.PreviousRecordId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PatientTimelineItem>(entity =>
        {
            entity.ToTable("patient_timeline_items");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.AppointmentId).HasColumnName("appointment_id");
            entity.Property(item => item.PatientId).HasColumnName("patient_id");
            entity.Property(item => item.ProfessionalId).HasColumnName("professional_id");
            entity.Property(item => item.SpaceId).HasColumnName("space_id");
            entity.Property(item => item.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(item => item.SourceType).HasColumnName("source_type").HasMaxLength(40).IsRequired();
            entity.Property(item => item.SourceId).HasColumnName("source_id");
            entity.Property(item => item.Title).HasColumnName("title").HasMaxLength(160).IsRequired();
            entity.Property(item => item.Summary).HasColumnName("summary").HasMaxLength(1000).IsRequired();
            entity.Property(item => item.Layer).HasColumnName("layer").HasMaxLength(40).IsRequired();
            entity.Property(item => item.OccurredAt).HasColumnName("occurred_at");
            entity.Property(item => item.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(item => new { item.PatientId, item.ProfessionalId, item.OccurredAt });
            entity.HasIndex(item => new { item.AppointmentId, item.CreatedAt });
            entity.HasOne(item => item.Appointment)
                .WithMany()
                .HasForeignKey(item => item.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(item => item.Patient)
                .WithMany()
                .HasForeignKey(item => item.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(item => item.Professional)
                .WithMany()
                .HasForeignKey(item => item.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(item => item.Space)
                .WithMany()
                .HasForeignKey(item => item.SpaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(item => item.CreatedBy)
                .WithMany()
                .HasForeignKey(item => item.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PatientConsent>(entity =>
        {
            entity.ToTable("patient_consents");
            entity.HasKey(consent => consent.Id);
            entity.Property(consent => consent.Id).HasColumnName("id");
            entity.Property(consent => consent.PatientId).HasColumnName("patient_id");
            entity.Property(consent => consent.ProfessionalId).HasColumnName("professional_id");
            entity.Property(consent => consent.SpaceId).HasColumnName("space_id");
            entity.Property(consent => consent.UpdatedByUserId).HasColumnName("updated_by_user_id");
            entity.Property(consent => consent.ConsentType).HasColumnName("consent_type").HasMaxLength(40).IsRequired();
            entity.Property(consent => consent.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(consent => consent.TermsVersion).HasColumnName("terms_version").HasMaxLength(40).IsRequired();
            entity.Property(consent => consent.GrantedAt).HasColumnName("granted_at");
            entity.Property(consent => consent.RevokedAt).HasColumnName("revoked_at");
            entity.Property(consent => consent.ExpiresAt).HasColumnName("expires_at");
            entity.Property(consent => consent.CreatedAt).HasColumnName("created_at");
            entity.Property(consent => consent.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(consent => new { consent.PatientId, consent.ProfessionalId, consent.ConsentType }).IsUnique();
            entity.HasIndex(consent => new { consent.ProfessionalId, consent.Status });
            entity.HasIndex(consent => consent.SpaceId);
            entity.HasOne(consent => consent.Patient)
                .WithMany()
                .HasForeignKey(consent => consent.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(consent => consent.Professional)
                .WithMany()
                .HasForeignKey(consent => consent.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(consent => consent.Space)
                .WithMany()
                .HasForeignKey(consent => consent.SpaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(consent => consent.UpdatedBy)
                .WithMany()
                .HasForeignKey(consent => consent.UpdatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClinicalSession>(entity =>
        {
            entity.ToTable("clinical_sessions");
            entity.HasKey(session => session.Id);
            entity.Property(session => session.Id).HasColumnName("id");
            entity.Property(session => session.AppointmentId).HasColumnName("appointment_id");
            entity.Property(session => session.PatientId).HasColumnName("patient_id");
            entity.Property(session => session.ProfessionalId).HasColumnName("professional_id");
            entity.Property(session => session.SpaceId).HasColumnName("space_id");
            entity.Property(session => session.SessionType).HasColumnName("session_type").HasMaxLength(40).IsRequired();
            entity.Property(session => session.Status).HasColumnName("status").HasMaxLength(40).IsRequired();
            entity.Property(session => session.StartedAt).HasColumnName("started_at");
            entity.Property(session => session.EndedAt).HasColumnName("ended_at");
            entity.Property(session => session.CreatedAt).HasColumnName("created_at");
            entity.Property(session => session.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(session => session.AppointmentId).IsUnique();
            entity.HasIndex(session => new { session.PatientId, session.ProfessionalId, session.StartedAt });
            entity.HasOne(session => session.Appointment)
                .WithMany()
                .HasForeignKey(session => session.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(session => session.Patient)
                .WithMany()
                .HasForeignKey(session => session.PatientId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(session => session.Professional)
                .WithMany()
                .HasForeignKey(session => session.ProfessionalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(session => session.Space)
                .WithMany()
                .HasForeignKey(session => session.SpaceId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
