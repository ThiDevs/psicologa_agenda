namespace PsiAgenda.Domain.Entities;

public sealed class PatientTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? AppointmentId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public required string Status { get; set; }
    public bool AcceptsResponse { get; set; }
    public DateTimeOffset? SharedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Appointment? Appointment { get; set; }
    public User? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Space? Space { get; set; }
    public User? CreatedBy { get; set; }
}
