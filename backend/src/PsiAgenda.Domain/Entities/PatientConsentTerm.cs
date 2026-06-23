namespace PsiAgenda.Domain.Entities;

public sealed class PatientConsentTerm
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string ConsentType { get; set; }
    public required string Version { get; set; }
    public required string Title { get; set; }
    public required string Summary { get; set; }
    public required string LegalBasis { get; set; }
    public required string RetentionPolicy { get; set; }
    public required string ReviewNotice { get; set; }
    public bool Sensitive { get; set; }
    public bool RequiresExplicitPatientDecision { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset EffectiveAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RetiredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
