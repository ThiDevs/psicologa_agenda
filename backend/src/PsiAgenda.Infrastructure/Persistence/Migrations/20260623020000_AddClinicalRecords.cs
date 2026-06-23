using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623020000_AddClinicalRecords")]
public partial class AddClinicalRecords : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "clinical_records",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                draft_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                approved_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                record_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                content_text = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                tags_json = table.Column<string>(type: "jsonb", nullable: true),
                version = table.Column<int>(type: "integer", nullable: false),
                previous_record_id = table.Column<Guid>(type: "uuid", nullable: true),
                approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_clinical_records", x => x.id);
                table.ForeignKey(
                    name: "fk_clinical_records_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_records_clinical_drafts_draft_id",
                    column: x => x.draft_id,
                    principalTable: "clinical_drafts",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_records_clinical_records_previous_record_id",
                    column: x => x.previous_record_id,
                    principalTable: "clinical_records",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_records_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_records_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_records_users_approved_by_user_id",
                    column: x => x.approved_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_records_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_clinical_records_appointment_id_approved_at",
            table: "clinical_records",
            columns: new[] { "appointment_id", "approved_at" });

        migrationBuilder.CreateIndex(
            name: "ix_clinical_records_approved_by_user_id",
            table: "clinical_records",
            column: "approved_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_records_draft_id",
            table: "clinical_records",
            column: "draft_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_records_patient_id_professional_id_version",
            table: "clinical_records",
            columns: new[] { "patient_id", "professional_id", "version" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_clinical_records_previous_record_id",
            table: "clinical_records",
            column: "previous_record_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_records_professional_id",
            table: "clinical_records",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_records_space_id",
            table: "clinical_records",
            column: "space_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "clinical_records");
    }
}
