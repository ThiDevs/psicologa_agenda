namespace NailsAgenda.Application.Spaces;

public sealed record CreateSpaceRequest(
    string Name,
    string Description,
    string Category,
    string Phone,
    string Whatsapp,
    string Address,
    string Neighborhood,
    string City,
    string State,
    string? ZipCode,
    double? Latitude,
    double? Longitude);

public sealed record UpdateSpaceRequest(
    string Name,
    string Description,
    string Category,
    string Phone,
    string Whatsapp,
    string Address,
    string Neighborhood,
    string City,
    string State,
    string? ZipCode,
    double? Latitude,
    double? Longitude);

public sealed record SpaceDto(
    Guid Id,
    string Name,
    string Description,
    string Category,
    string Phone,
    string Whatsapp,
    string Address,
    string Neighborhood,
    string City,
    string State,
    string? ZipCode,
    double? Latitude,
    double? Longitude,
    bool Active,
    bool Published,
    bool OnboardingCompleted,
    bool AllowOnlineBooking,
    bool RequireManualApproval);

public sealed record OnboardingChecklistItemDto(
    string Id,
    string Label,
    bool Complete);

public sealed record ServiceCategoryDto(
    Guid Id,
    Guid SpaceId,
    string Name,
    bool Active);

public sealed record UpsertServiceCategoryRequest(string Name);

public sealed record ServiceDto(
    Guid Id,
    Guid SpaceId,
    string Name,
    string Description,
    string Category,
    decimal Price,
    int DurationMinutes,
    int BufferAfterMinutes,
    bool Active,
    bool OnlineBooking);

public sealed record UpsertServiceRequest(
    string Name,
    string Description,
    string Category,
    decimal Price,
    int DurationMinutes,
    int BufferAfterMinutes,
    bool OnlineBooking,
    bool Active);

public sealed record ProfessionalDto(
    Guid Id,
    Guid SpaceId,
    string Name,
    string? Email,
    string Specialty,
    int ExperienceYears,
    IReadOnlyList<Guid> ServiceIds,
    bool Active);

public sealed record UpsertProfessionalRequest(
    string Name,
    string? Email,
    string Specialty,
    int ExperienceYears,
    IReadOnlyList<Guid> ServiceIds,
    bool Active);

public sealed record OpeningHourDto(
    Guid Id,
    Guid SpaceId,
    int DayOfWeek,
    bool IsOpen,
    string? StartTime,
    string? EndTime);

public sealed record UpdateOpeningHoursRequest(IReadOnlyList<OpeningHourInput> Hours);

public sealed record OpeningHourInput(
    int DayOfWeek,
    bool IsOpen,
    string? StartTime,
    string? EndTime);

public sealed record ProfessionalScheduleDto(
    Guid Id,
    Guid ProfessionalId,
    int DayOfWeek,
    string StartTime,
    string EndTime,
    string? BreakStartTime,
    string? BreakEndTime,
    bool Active);

public sealed record UpdateProfessionalScheduleRequest(IReadOnlyList<ProfessionalScheduleInput> Schedules);

public sealed record ProfessionalScheduleInput(
    int DayOfWeek,
    string StartTime,
    string EndTime,
    string? BreakStartTime,
    string? BreakEndTime,
    bool Active);

public sealed record BlockedTimeDto(
    Guid Id,
    Guid SpaceId,
    Guid? ProfessionalId,
    string Date,
    string StartTime,
    string EndTime,
    string Reason,
    bool Active);

public sealed record CreateBlockedTimeRequest(
    Guid? ProfessionalId,
    string Date,
    string StartTime,
    string EndTime,
    string Reason);

public sealed record SpacePaymentSettingsDto(
    bool AllowPix,
    bool AllowCreditCard,
    bool AllowDebitCard,
    bool AllowPayOnSite,
    bool RequirePrePayment,
    bool RequireDeposit,
    string? DepositType,
    decimal? DepositValue,
    decimal ServiceFeePercentage,
    int ReservationExpirationMinutes);

public sealed record UpdatePaymentSettingsRequest(
    bool AllowPix,
    bool AllowCreditCard,
    bool AllowDebitCard,
    bool AllowPayOnSite,
    bool RequirePrePayment,
    bool RequireDeposit,
    string? DepositType,
    decimal? DepositValue,
    decimal ServiceFeePercentage,
    int ReservationExpirationMinutes);

public sealed record SpaceBookingSettingsDto(
    bool AllowOnlineBooking,
    bool RequireManualApproval);

public sealed record UpdateSpaceBookingSettingsRequest(
    bool AllowOnlineBooking,
    bool RequireManualApproval);

public sealed record SpaceCancellationPolicyDto(
    bool AllowCustomerCancel,
    int FreeCancelBeforeHours,
    bool AllowReschedule,
    int FreeRescheduleBeforeHours,
    bool ChargeLateCancelFee,
    decimal? LateCancelFee,
    string PolicyText);

public sealed record UpdateCancellationPolicyRequest(
    bool AllowCustomerCancel,
    int FreeCancelBeforeHours,
    bool AllowReschedule,
    int FreeRescheduleBeforeHours,
    bool ChargeLateCancelFee,
    decimal? LateCancelFee,
    string PolicyText);

public sealed record SpacePhotoDto(
    Guid Id,
    Guid SpaceId,
    string Url,
    string? Caption,
    int SortOrder,
    bool Active,
    DateTimeOffset CreatedAt);

public sealed record UpsertSpacePhotoRequest(
    string Url,
    string? Caption,
    int SortOrder,
    bool Active);

public sealed record SpaceNotificationSettingsDto(
    bool NotifyCustomerOnBooking,
    bool NotifyCustomerOnCancel,
    bool NotifyCustomerOnReschedule,
    bool NotifyOwnerOnBooking,
    bool NotifyProfessionalOnBooking,
    int ReminderHoursBefore,
    bool Active);

public sealed record UpdateNotificationSettingsRequest(
    bool NotifyCustomerOnBooking,
    bool NotifyCustomerOnCancel,
    bool NotifyCustomerOnReschedule,
    bool NotifyOwnerOnBooking,
    bool NotifyProfessionalOnBooking,
    int ReminderHoursBefore,
    bool Active);

public sealed record NotificationDto(
    Guid Id,
    Guid? UserId,
    Guid? SpaceId,
    Guid? AppointmentId,
    string Title,
    string Message,
    bool Read,
    DateTimeOffset CreatedAt);

public sealed record ReviewDto(
    Guid Id,
    Guid AppointmentId,
    Guid SpaceId,
    Guid CustomerId,
    int Rating,
    string? Comment,
    DateTimeOffset CreatedAt);

public sealed record CreateReviewRequest(int Rating, string? Comment);

public sealed record CancelAppointmentRequest(string? Reason);

public sealed record RescheduleAppointmentRequest(
    Guid? ProfessionalId,
    bool AnyProfessional,
    string Date,
    string StartTime);

public sealed record PublicSpaceListItemDto(
    Guid Id,
    string Name,
    string Description,
    string Category,
    string Address,
    string Neighborhood,
    string City,
    string State,
    string Phone,
    string Whatsapp,
    double? Latitude,
    double? Longitude,
    double? DistanceKm,
    decimal MinPrice,
    int ServicesCount,
    int ProfessionalsCount);

public sealed record PublicSpaceDetailsDto(
    SpaceDto Space,
    IReadOnlyList<SpacePhotoDto> Photos,
    IReadOnlyList<ServiceCategoryDto> Categories,
    IReadOnlyList<ServiceDto> Services,
    IReadOnlyList<ProfessionalDto> Professionals,
    IReadOnlyList<OpeningHourDto> OpeningHours,
    SpacePaymentSettingsDto PaymentSettings,
    SpaceCancellationPolicyDto CancellationPolicy);

public sealed record AvailabilitySearchRequest(
    Guid SpaceId,
    IReadOnlyList<Guid> ServiceIds,
    Guid? ProfessionalId,
    bool AnyProfessional,
    string Date);

public sealed record TimeSlotDto(
    string Id,
    string Date,
    string StartTime,
    string EndTime,
    Guid ProfessionalId,
    string ProfessionalName,
    bool Available,
    string? Reason);

public sealed record ReserveAppointmentRequest(
    Guid SpaceId,
    IReadOnlyList<Guid> ServiceIds,
    Guid? ProfessionalId,
    bool AnyProfessional,
    string Date,
    string StartTime,
    string PaymentMethodId);

public sealed record AppointmentDto(
    Guid Id,
    string Code,
    Guid CustomerId,
    Guid SpaceId,
    Guid ProfessionalId,
    bool AnyProfessional,
    IReadOnlyList<Guid> ServiceIds,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    int TotalDurationMinutes,
    decimal Subtotal,
    decimal ServiceFee,
    decimal Total,
    string Status,
    string PaymentMethodId,
    string PaymentStatus,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt);

public sealed record AppointmentDetailsDto(
    AppointmentDto Appointment,
    SpaceDto Space,
    ProfessionalDto Professional,
    IReadOnlyList<ServiceDto> Services,
    ReviewDto? Review);

public sealed record StarterSetupDto(
    SpaceDto Space,
    IReadOnlyList<ServiceDto> Services,
    IReadOnlyList<ProfessionalDto> Professionals,
    IReadOnlyList<OnboardingChecklistItemDto> Checklist);

public sealed record OwnerDashboardDto(
    SpaceDto Space,
    int TodayAppointmentsCount,
    decimal EstimatedRevenue,
    decimal FutureRevenue,
    int PendingPaymentCount,
    int ActiveServicesCount,
    int ActiveProfessionalsCount,
    bool ChecklistComplete);

public interface ISpaceService
{
    Task<SpaceDto> CreateSpaceAsync(Guid ownerUserId, CreateSpaceRequest request, CancellationToken cancellationToken);
    Task<SpaceDto> UpdateSpaceAsync(Guid userId, Guid spaceId, UpdateSpaceRequest request, CancellationToken cancellationToken);
    Task<StarterSetupDto> CompleteStarterSetupAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<IReadOnlyList<SpaceDto>> GetMySpacesAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<OnboardingChecklistItemDto>> GetOnboardingChecklistAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<OwnerDashboardDto> GetOwnerDashboardAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ServiceCategoryDto>> GetServiceCategoriesAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<ServiceCategoryDto> CreateServiceCategoryAsync(Guid userId, Guid spaceId, UpsertServiceCategoryRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ServiceDto>> GetServicesAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<ServiceDto> CreateServiceAsync(Guid userId, Guid spaceId, UpsertServiceRequest request, CancellationToken cancellationToken);
    Task<ServiceDto> UpdateServiceAsync(Guid userId, Guid spaceId, Guid serviceId, UpsertServiceRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProfessionalDto>> GetProfessionalsAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<ProfessionalDto> CreateProfessionalAsync(Guid userId, Guid spaceId, UpsertProfessionalRequest request, CancellationToken cancellationToken);
    Task<ProfessionalDto> UpdateProfessionalAsync(Guid userId, Guid spaceId, Guid professionalId, UpsertProfessionalRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<OpeningHourDto>> GetOpeningHoursAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<IReadOnlyList<OpeningHourDto>> UpdateOpeningHoursAsync(Guid userId, Guid spaceId, UpdateOpeningHoursRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProfessionalScheduleDto>> GetProfessionalScheduleAsync(Guid userId, Guid spaceId, Guid professionalId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProfessionalScheduleDto>> UpdateProfessionalScheduleAsync(Guid userId, Guid spaceId, Guid professionalId, UpdateProfessionalScheduleRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<BlockedTimeDto>> GetBlockedTimesAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<BlockedTimeDto> CreateBlockedTimeAsync(Guid userId, Guid spaceId, CreateBlockedTimeRequest request, CancellationToken cancellationToken);
    Task DeleteBlockedTimeAsync(Guid userId, Guid spaceId, Guid blockedTimeId, CancellationToken cancellationToken);
    Task<SpaceBookingSettingsDto> GetBookingSettingsAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<SpaceBookingSettingsDto> UpdateBookingSettingsAsync(Guid userId, Guid spaceId, UpdateSpaceBookingSettingsRequest request, CancellationToken cancellationToken);
    Task<SpacePaymentSettingsDto> GetPaymentSettingsAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<SpacePaymentSettingsDto> UpdatePaymentSettingsAsync(Guid userId, Guid spaceId, UpdatePaymentSettingsRequest request, CancellationToken cancellationToken);
    Task<SpaceCancellationPolicyDto> GetCancellationPolicyAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<SpaceCancellationPolicyDto> UpdateCancellationPolicyAsync(Guid userId, Guid spaceId, UpdateCancellationPolicyRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<AppointmentDto>> GetSpaceAppointmentsAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<AppointmentDetailsDto> GetSpaceAppointmentDetailsAsync(Guid userId, Guid spaceId, Guid appointmentId, CancellationToken cancellationToken);
    Task<AppointmentDto> ConfirmSpaceAppointmentAsync(Guid userId, Guid spaceId, Guid appointmentId, CancellationToken cancellationToken);
    Task<AppointmentDto> CompleteSpaceAppointmentAsync(Guid userId, Guid spaceId, Guid appointmentId, CancellationToken cancellationToken);
    Task<AppointmentDto> MarkSpaceAppointmentNoShowAsync(Guid userId, Guid spaceId, Guid appointmentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<SpacePhotoDto>> GetSpacePhotosAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<SpacePhotoDto> CreateSpacePhotoAsync(Guid userId, Guid spaceId, UpsertSpacePhotoRequest request, CancellationToken cancellationToken);
    Task DeleteSpacePhotoAsync(Guid userId, Guid spaceId, Guid photoId, CancellationToken cancellationToken);
    Task<SpaceNotificationSettingsDto> GetNotificationSettingsAsync(Guid userId, Guid spaceId, CancellationToken cancellationToken);
    Task<SpaceNotificationSettingsDto> UpdateNotificationSettingsAsync(Guid userId, Guid spaceId, UpdateNotificationSettingsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PublicSpaceListItemDto>> GetPublishedSpacesAsync(double? latitude, double? longitude, CancellationToken cancellationToken);
    Task<PublicSpaceDetailsDto> GetPublishedSpaceDetailsAsync(Guid spaceId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProfessionalDto>> GetCompatibleProfessionalsAsync(Guid spaceId, IReadOnlyList<Guid> serviceIds, CancellationToken cancellationToken);
    Task<IReadOnlyList<TimeSlotDto>> SearchAvailabilityAsync(AvailabilitySearchRequest request, CancellationToken cancellationToken);
    Task<AppointmentDto> ReserveAppointmentAsync(Guid customerId, ReserveAppointmentRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<AppointmentDto>> GetCustomerAppointmentsAsync(Guid customerId, CancellationToken cancellationToken);
    Task<AppointmentDetailsDto> GetCustomerAppointmentDetailsAsync(Guid customerId, Guid appointmentId, CancellationToken cancellationToken);
    Task<AppointmentDto> CancelCustomerAppointmentAsync(Guid customerId, Guid appointmentId, CancelAppointmentRequest request, CancellationToken cancellationToken);
    Task<AppointmentDto> RescheduleCustomerAppointmentAsync(Guid customerId, Guid appointmentId, RescheduleAppointmentRequest request, CancellationToken cancellationToken);
    Task<ReviewDto> CreateAppointmentReviewAsync(Guid customerId, Guid appointmentId, CreateReviewRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<AppointmentDto>> GetProfessionalAppointmentsAsync(Guid professionalUserId, CancellationToken cancellationToken);
    Task<AppointmentDetailsDto> GetProfessionalAppointmentDetailsAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<AppointmentDto> CompleteProfessionalAppointmentAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<AppointmentDto> MarkProfessionalAppointmentNoShowAsync(Guid professionalUserId, Guid appointmentId, CancellationToken cancellationToken);
    Task<BlockedTimeDto> CreateProfessionalBlockedTimeAsync(Guid professionalUserId, CreateBlockedTimeRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<NotificationDto>> GetMyNotificationsAsync(Guid userId, CancellationToken cancellationToken);
    Task MarkNotificationReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken);
    Task<int> ExpireReservationsAsync(CancellationToken cancellationToken);
}
