namespace NailsAgenda.Domain.Entities;

public sealed class Space
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string Category { get; set; }
    public required string Phone { get; set; }
    public required string Whatsapp { get; set; }
    public required string Address { get; set; }
    public required string Neighborhood { get; set; }
    public required string City { get; set; }
    public required string State { get; set; }
    public string? ZipCode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool Active { get; set; } = true;
    public bool Published { get; set; }
    public bool OnboardingCompleted { get; set; }
    public bool AllowOnlineBooking { get; set; } = true;
    public bool RequireManualApproval { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public ICollection<SpaceUser> SpaceUsers { get; set; } = new List<SpaceUser>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Professional> Professionals { get; set; } = new List<Professional>();
    public ICollection<ServiceCategory> ServiceCategories { get; set; } = new List<ServiceCategory>();
    public ICollection<SpaceOpeningHour> OpeningHours { get; set; } = new List<SpaceOpeningHour>();
    public ICollection<BlockedTime> BlockedTimes { get; set; } = new List<BlockedTime>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<SpacePhoto> Photos { get; set; } = new List<SpacePhoto>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public SpacePaymentSettings? PaymentSettings { get; set; }
    public SpaceCancellationPolicy? CancellationPolicy { get; set; }
    public SpaceNotificationSettings? NotificationSettings { get; set; }
}
