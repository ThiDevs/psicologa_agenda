namespace PsiAgenda.Infrastructure.Services;

public sealed class MeetingRoomOptions
{
    public const string SectionName = "MeetingRoom";
    private const string DefaultBaseUrl = "https://meet.jit.si";

    public string BaseUrl { get; init; } = DefaultBaseUrl;

    public string GetNormalizedBaseUrl()
    {
        var trimmed = BaseUrl.Trim();

        return string.IsNullOrWhiteSpace(trimmed)
            ? DefaultBaseUrl
            : trimmed.TrimEnd('/');
    }
}
