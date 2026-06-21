namespace PsiAgenda.Api.Endpoints;

public static class PublicPageEndpoints
{
    private static readonly string[] PublicPageMethods = [HttpMethods.Get, HttpMethods.Head];

    public static IEndpointRouteBuilder MapPublicPageEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPublicPage("/privacy", "privacy.html", "PrivacyPolicy");
        app.MapPublicPage("/terms", "terms.html", "TermsOfUse");
        app.MapPublicPage("/support", "support.html", "Support");

        return app;
    }

    private static void MapPublicPage(this IEndpointRouteBuilder app, string route, string fileName, string endpointName)
    {
        var routes = new[]
        {
            (Route: route, Name: endpointName),
            (Route: $"/api{route}", Name: $"{endpointName}Api")
        };

        foreach (var publicRoute in routes)
        {
            app.MapMethods(publicRoute.Route, PublicPageMethods, (IWebHostEnvironment environment, CancellationToken cancellationToken) =>
                    ServePageAsync(fileName, environment, cancellationToken))
                .AllowAnonymous()
                .WithTags("Public Pages")
                .WithName(publicRoute.Name);
        }
    }

    private static async Task<IResult> ServePageAsync(
        string fileName,
        IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var webRootPath = environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            return Results.NotFound();
        }

        var filePath = Path.Combine(webRootPath, "legal", fileName);
        if (!File.Exists(filePath))
        {
            return Results.NotFound();
        }

        var html = await File.ReadAllTextAsync(filePath, cancellationToken);

        return Results.Content(html, "text/html; charset=utf-8");
    }
}
