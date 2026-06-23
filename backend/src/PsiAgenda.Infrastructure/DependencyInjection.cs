using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PsiAgenda.Application.Auth;
using PsiAgenda.Application.Clinical;
using PsiAgenda.Application.Common;
using PsiAgenda.Application.Spaces;
using PsiAgenda.Infrastructure.Auth;
using PsiAgenda.Infrastructure.Persistence;
using PsiAgenda.Infrastructure.Services;

namespace PsiAgenda.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") ??
            "Host=localhost;Port=5432;Database=psi_agenda;Username=psi;Password=psi";

        services.AddDbContext<PsiAgendaDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.Configure<BusinessClockOptions>(
            configuration.GetSection(BusinessClockOptions.SectionName));
        services.Configure<MeetingRoomOptions>(
            configuration.GetSection(MeetingRoomOptions.SectionName));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IClinicalService, ClinicalService>();
        services.AddScoped<ISpaceService, SpaceService>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddHostedService<ExpiredReservationsWorker>();

        return services;
    }
}
