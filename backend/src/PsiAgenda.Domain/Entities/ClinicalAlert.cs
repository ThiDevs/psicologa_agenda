namespace PsiAgenda.Domain.Entities;

public sealed class ClinicalAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? AppointmentId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public required string SourceType { get; set; }
    public Guid? SourceId { get; set; }
    public required string Title { get; set; }
    public required string Description { get; set; }
    public required string Severity { get; set; }
    public required string Status { get; set; }
    public string? ReviewNote { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Appointment? Appointment { get; set; }
    public User? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Space? Space { get; set; }
    public User? CreatedBy { get; set; }
    public User? ReviewedBy { get; set; }
}
