namespace PsiAgenda.Domain.Entities;

public sealed class ProfessionalService
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProfessionalId { get; set; }
    public Guid ServiceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Professional? Professional { get; set; }
    public Service? Service { get; set; }
}
