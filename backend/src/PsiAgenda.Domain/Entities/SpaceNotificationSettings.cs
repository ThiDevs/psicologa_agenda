namespace PsiAgenda.Domain.Entities;

public sealed class SpaceNotificationSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public bool NotifyCustomerOnBooking { get; set; } = true;
    public bool NotifyCustomerOnCancel { get; set; } = true;
    public bool NotifyCustomerOnReschedule { get; set; } = true;
    public bool NotifyOwnerOnBooking { get; set; } = true;
    public bool NotifyProfessionalOnBooking { get; set; } = true;
    public int ReminderHoursBefore { get; set; } = 24;
    public bool Active { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Space? Space { get; set; }
}
