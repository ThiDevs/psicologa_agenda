using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NailsAgenda.Application.Auth;
using NailsAgenda.Application.Common;
using NailsAgenda.Application.Spaces;
using NailsAgenda.Infrastructure.Auth;
using NailsAgenda.Infrastructure.Persistence;
using NailsAgenda.Infrastructure.Services;

namespace NailsAgenda.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") ??
            "Host=localhost;Port=5432;Database=nails_agenda;Username=nails;Password=nails";

        services.AddDbContext<NailsAgendaDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.Configure<BusinessClockOptions>(
            configuration.GetSection(BusinessClockOptions.SectionName));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISpaceService, SpaceService>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddHostedService<ExpiredReservationsWorker>();

        return services;
    }
}
