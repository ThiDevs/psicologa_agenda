namespace NailsAgenda.Domain.Entities;

public sealed class SpacePaymentSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public bool AllowPix { get; set; }
    public bool AllowCreditCard { get; set; } = true;
    public bool AllowDebitCard { get; set; } = true;
    public bool AllowPayOnSite { get; set; } = true;
    public bool RequirePrePayment { get; set; }
    public bool RequireDeposit { get; set; }
    public string? DepositType { get; set; }
    public decimal? DepositValue { get; set; }
    public decimal ServiceFeePercentage { get; set; }
    public int ReservationExpirationMinutes { get; set; } = 10;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Space? Space { get; set; }
}
