using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623081000_BackfillPatientConsentEvents")]
public partial class BackfillPatientConsentEvents : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            insert into patient_consent_events (
                id,
                patient_consent_id,
                patient_id,
                professional_id,
                space_id,
                appointment_id,
                actor_user_id,
                consent_type,
                status,
                action,
                terms_version,
                granted_at,
                revoked_at,
                expires_at,
                created_at
            )
            select
                gen_random_uuid(),
                consent.id,
                consent.patient_id,
                consent.professional_id,
                consent.space_id,
                null,
                consent.updated_by_user_id,
                consent.consent_type,
                consent.status,
                'migrated',
                consent.terms_version,
                consent.granted_at,
                consent.revoked_at,
                consent.expires_at,
                consent.updated_at
            from patient_consents consent
            where not exists (
                select 1
                from patient_consent_events event
                where event.patient_consent_id = consent.id
            );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            delete from patient_consent_events
            where action = 'migrated';
            """);
    }
}
