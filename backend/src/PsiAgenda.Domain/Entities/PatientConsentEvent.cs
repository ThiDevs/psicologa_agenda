namespace PsiAgenda.Domain.Entities;

public sealed class PatientConsentEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientConsentId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid? AppointmentId { get; set; }
    public Guid ActorUserId { get; set; }
    public required string ConsentType { get; set; }
    public required string Status { get; set; }
    public required string Action { get; set; }
    public required string TermsVersion { get; set; }
    public DateTimeOffset? GrantedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public PatientConsent? PatientConsent { get; set; }
    public User? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Space? Space { get; set; }
    public Appointment? Appointment { get; set; }
    public User? ActorUser { get; set; }
}
