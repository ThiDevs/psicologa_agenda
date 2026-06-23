namespace PsiAgenda.Domain.Entities;

public sealed class AppliedClinicalTag
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? AppointmentId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid AppliedByUserId { get; set; }
    public required string Label { get; set; }
    public required string Tone { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset AppliedAt { get; set; } = DateTimeOffset.UtcNow;

    public Appointment? Appointment { get; set; }
    public User? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Space? Space { get; set; }
    public User? AppliedBy { get; set; }
}
