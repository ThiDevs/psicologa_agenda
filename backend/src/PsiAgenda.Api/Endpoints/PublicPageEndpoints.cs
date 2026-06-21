namespace PsiAgenda.Api.Endpoints;

public static class PublicPageEndpoints
{
    private static readonly string[] PublicPageMethods = [HttpMethods.Get, HttpMethods.Head];

    public static IEndpointRouteBuilder MapPublicPageEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapMethods("/privacy", PublicPageMethods, (IWebHostEnvironment environment, CancellationToken cancellationToken) =>
                ServePageAsync("privacy.html", environment, cancellationToken))
            .AllowAnonymous()
            .WithTags("Public Pages")
            .WithName("PrivacyPolicy");

        app.MapMethods("/terms", PublicPageMethods, (IWebHostEnvironment environment, CancellationToken cancellationToken) =>
                ServePageAsync("terms.html", environment, cancellationToken))
            .AllowAnonymous()
            .WithTags("Public Pages")
            .WithName("TermsOfUse");

        app.MapMethods("/support", PublicPageMethods, (IWebHostEnvironment environment, CancellationToken cancellationToken) =>
                ServePageAsync("support.html", environment, cancellationToken))
            .AllowAnonymous()
            .WithTags("Public Pages")
            .WithName("Support");

        return app;
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
