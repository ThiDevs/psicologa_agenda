using System.Globalization;

namespace PsiAgenda.Infrastructure.Services;

public sealed class BusinessClockOptions
{
    public const string SectionName = "BusinessClock";

    public string TimeZoneId { get; init; } = "America/Sao_Paulo";
    public string UtcOffset { get; init; } = "-03:00";

    public TimeSpan GetFallbackUtcOffset()
    {
        return TimeSpan.TryParse(UtcOffset, CultureInfo.InvariantCulture, out var offset) &&
            offset >= TimeSpan.FromHours(-12) &&
            offset <= TimeSpan.FromHours(14)
                ? offset
                : TimeSpan.FromHours(-3);
    }
}
