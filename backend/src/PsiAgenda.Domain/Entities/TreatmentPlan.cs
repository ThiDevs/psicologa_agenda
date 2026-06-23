namespace PsiAgenda.Domain.Entities;

public sealed class TreatmentPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Guid ProfessionalId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid UpdatedByUserId { get; set; }
    public required string Status { get; set; }
    public string? CaseFormulation { get; set; }
    public string? GoalsJson { get; set; }
    public string? StrategiesJson { get; set; }
    public string? ObstaclesJson { get; set; }
    public string? ReviewCadence { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? Patient { get; set; }
    public Professional? Professional { get; set; }
    public Space? Space { get; set; }
    public User? UpdatedBy { get; set; }
}
