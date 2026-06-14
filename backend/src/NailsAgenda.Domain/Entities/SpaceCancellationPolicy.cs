namespace NailsAgenda.Domain.Entities;

public sealed class SpaceCancellationPolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public bool AllowCustomerCancel { get; set; } = true;
    public int FreeCancelBeforeHours { get; set; } = 24;
    public bool AllowReschedule { get; set; } = true;
    public int FreeRescheduleBeforeHours { get; set; } = 24;
    public bool ChargeLateCancelFee { get; set; }
    public decimal? LateCancelFee { get; set; }
    public required string PolicyText { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    public Space? Space { get; set; }
}
