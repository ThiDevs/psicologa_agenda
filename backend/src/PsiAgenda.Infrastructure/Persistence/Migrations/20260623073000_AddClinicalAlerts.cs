using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623073000_AddClinicalAlerts")]
public partial class AddClinicalAlerts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "clinical_alerts",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                source_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                source_id = table.Column<Guid>(type: "uuid", nullable: true),
                title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                description = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: false),
                severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                review_note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                reviewed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                resolved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_clinical_alerts", x => x.id);
                table.ForeignKey(
                    name: "fk_clinical_alerts_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_alerts_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_alerts_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_alerts_users_created_by_user_id",
                    column: x => x.created_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_alerts_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_alerts_users_reviewed_by_user_id",
                    column: x => x.reviewed_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_clinical_alerts_appointment_id_created_at",
            table: "clinical_alerts",
            columns: new[] { "appointment_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_clinical_alerts_created_by_user_id",
            table: "clinical_alerts",
            column: "created_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_alerts_patient_id_professional_id_status",
            table: "clinical_alerts",
            columns: new[] { "patient_id", "professional_id", "status" });

        migrationBuilder.CreateIndex(
            name: "ix_clinical_alerts_professional_id",
            table: "clinical_alerts",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_alerts_reviewed_by_user_id",
            table: "clinical_alerts",
            column: "reviewed_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_alerts_space_id",
            table: "clinical_alerts",
            column: "space_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "clinical_alerts");
    }
}
