using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623080000_AddPatientConsentEvents")]
public partial class AddPatientConsentEvents : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "patient_consent_events",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                patient_consent_id = table.Column<Guid>(type: "uuid", nullable: false),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                consent_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                terms_version = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                granted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                revoked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_patient_consent_events", x => x.id);
                table.ForeignKey(
                    name: "fk_patient_consent_events_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_consent_events_patient_consents_patient_consent_id",
                    column: x => x.patient_consent_id,
                    principalTable: "patient_consents",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_patient_consent_events_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_consent_events_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_consent_events_users_actor_user_id",
                    column: x => x.actor_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_consent_events_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_events_actor_user_id",
            table: "patient_consent_events",
            column: "actor_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_events_appointment_id",
            table: "patient_consent_events",
            column: "appointment_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_events_patient_consent_id",
            table: "patient_consent_events",
            column: "patient_consent_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_events_patient_id_professional_id_consent_type_created_at",
            table: "patient_consent_events",
            columns: new[] { "patient_id", "professional_id", "consent_type", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_events_professional_id",
            table: "patient_consent_events",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_events_space_id",
            table: "patient_consent_events",
            column: "space_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "patient_consent_events");
    }
}
