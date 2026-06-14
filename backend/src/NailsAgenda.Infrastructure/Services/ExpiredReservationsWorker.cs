using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NailsAgenda.Application.Spaces;

namespace NailsAgenda.Infrastructure.Services;

public sealed class ExpiredReservationsWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ExpiredReservationsWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<ISpaceService>();
                var expiredCount = await service.ExpireReservationsAsync(stoppingToken);

                if (expiredCount > 0)
                {
                    logger.LogInformation("Expired {Count} appointment reservations.", expiredCount);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Failed to expire appointment reservations.");
            }
        }
    }
}
