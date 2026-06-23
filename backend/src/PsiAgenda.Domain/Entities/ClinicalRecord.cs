namespace PsiAgenda.Domain.Entities;

public sealed class ClinicalRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? AppointmentId { get; set; }
    public Guid? DraftId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid ApprovedByUserId { get; set; }
    public required string RecordType { get; set; }
    public required string Status { get; set; }
    public required string ContentText { get; set; }
    public string? TagsJson { get; set; }
    public int Version { get; set; }
    public Guid? PreviousRecordId { get; set; }
    public DateTimeOffset ApprovedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Appointment? Appointment { get; set; }
    public ClinicalDraft? Draft { get; set; }
    public User? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Space? Space { get; set; }
    public User? ApprovedBy { get; set; }
    public ClinicalRecord? PreviousRecord { get; set; }
}
