using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623085000_AddPatientConsentExpirationIndex")]
public partial class AddPatientConsentExpirationIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "ix_patient_consents_status_expires_at",
            table: "patient_consents",
            columns: new[] { "status", "expires_at" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "ix_patient_consents_status_expires_at",
            table: "patient_consents");
    }
}
