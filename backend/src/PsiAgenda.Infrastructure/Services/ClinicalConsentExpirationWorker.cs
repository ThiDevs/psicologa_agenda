using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PsiAgenda.Application.Clinical;

namespace PsiAgenda.Infrastructure.Services;

public sealed class ClinicalConsentExpirationWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ClinicalConsentExpirationWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ExpireDueConsentsAsync(stoppingToken);

        using var timer = new PeriodicTimer(Interval);

        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            await ExpireDueConsentsAsync(stoppingToken);
        }
    }

    private async Task ExpireDueConsentsAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var clinicalService = scope.ServiceProvider.GetRequiredService<IClinicalService>();
            var expiredCount = await clinicalService.ExpireDuePatientConsentsAsync(stoppingToken);

            if (expiredCount > 0)
            {
                logger.LogInformation("Expired {Count} clinical patient consents.", expiredCount);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to expire clinical patient consents.");
        }
    }
}
