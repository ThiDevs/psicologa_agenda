namespace PsiAgenda.Domain.Entities;

public sealed class ClinicalDraft
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? AppointmentId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public required string Status { get; set; }
    public required string Source { get; set; }
    public required string RecordType { get; set; }
    public Guid? PreviousRecordId { get; set; }
    public string? SessionNote { get; set; }
    public required string ContentText { get; set; }
    public string? TagsJson { get; set; }
    public bool AiGenerated { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Appointment? Appointment { get; set; }
    public User? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Space? Space { get; set; }
    public User? CreatedBy { get; set; }
    public ClinicalRecord? PreviousRecord { get; set; }
}
