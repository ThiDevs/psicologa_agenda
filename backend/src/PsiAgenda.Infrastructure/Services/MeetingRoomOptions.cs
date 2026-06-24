namespace PsiAgenda.Infrastructure.Services;

public sealed class MeetingRoomOptions
{
    public const string SectionName = "MeetingRoom";
    private const string DefaultAppBaseUrl = "https://psi.felicio.app/video-call";
    private const string DefaultFallbackBaseUrl = "https://meet.jit.si";

    public string? AppBaseUrl { get; init; } = DefaultAppBaseUrl;
    public string? FallbackBaseUrl { get; init; } = DefaultFallbackBaseUrl;

    public string GetNormalizedAppBaseUrl()
    {
        return Normalize(AppBaseUrl, DefaultAppBaseUrl);
    }

    public string GetNormalizedFallbackBaseUrl()
    {
        return Normalize(FallbackBaseUrl, DefaultFallbackBaseUrl);
    }

    private static string Normalize(string? value, string fallback)
    {
        var trimmed = value?.Trim();

        return string.IsNullOrWhiteSpace(trimmed)
            ? fallback
            : trimmed.TrimEnd('/');
    }
}
