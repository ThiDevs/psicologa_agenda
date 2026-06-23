using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623013000_AddClinicalWorkspaceTables")]
public partial class AddClinicalWorkspaceTables : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "applied_clinical_tags",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                applied_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                label = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                tone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                applied_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_applied_clinical_tags", x => x.id);
                table.ForeignKey(
                    name: "fk_applied_clinical_tags_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_applied_clinical_tags_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_applied_clinical_tags_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_applied_clinical_tags_users_applied_by_user_id",
                    column: x => x.applied_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_applied_clinical_tags_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "clinical_drafts",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                source = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                session_note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                content_text = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                tags_json = table.Column<string>(type: "jsonb", nullable: true),
                ai_generated = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_clinical_drafts", x => x.id);
                table.ForeignKey(
                    name: "fk_clinical_drafts_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_drafts_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_drafts_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_drafts_users_created_by_user_id",
                    column: x => x.created_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_clinical_drafts_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "patient_timeline_items",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                source_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                source_id = table.Column<Guid>(type: "uuid", nullable: true),
                title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                summary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                layer = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_patient_timeline_items", x => x.id);
                table.ForeignKey(
                    name: "fk_patient_timeline_items_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_timeline_items_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_timeline_items_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_timeline_items_users_created_by_user_id",
                    column: x => x.created_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_timeline_items_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_applied_clinical_tags_appointment_id_label",
            table: "applied_clinical_tags",
            columns: new[] { "appointment_id", "label" });

        migrationBuilder.CreateIndex(
            name: "ix_applied_clinical_tags_applied_by_user_id",
            table: "applied_clinical_tags",
            column: "applied_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_applied_clinical_tags_patient_id_professional_id",
            table: "applied_clinical_tags",
            columns: new[] { "patient_id", "professional_id" });

        migrationBuilder.CreateIndex(
            name: "ix_applied_clinical_tags_professional_id",
            table: "applied_clinical_tags",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_applied_clinical_tags_space_id",
            table: "applied_clinical_tags",
            column: "space_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_drafts_appointment_id_created_at",
            table: "clinical_drafts",
            columns: new[] { "appointment_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_clinical_drafts_created_by_user_id",
            table: "clinical_drafts",
            column: "created_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_drafts_patient_id_professional_id",
            table: "clinical_drafts",
            columns: new[] { "patient_id", "professional_id" });

        migrationBuilder.CreateIndex(
            name: "ix_clinical_drafts_professional_id",
            table: "clinical_drafts",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_clinical_drafts_space_id",
            table: "clinical_drafts",
            column: "space_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_timeline_items_appointment_id_created_at",
            table: "patient_timeline_items",
            columns: new[] { "appointment_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_timeline_items_created_by_user_id",
            table: "patient_timeline_items",
            column: "created_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_timeline_items_patient_id_professional_id_occurred_at",
            table: "patient_timeline_items",
            columns: new[] { "patient_id", "professional_id", "occurred_at" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_timeline_items_professional_id",
            table: "patient_timeline_items",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_timeline_items_space_id",
            table: "patient_timeline_items",
            column: "space_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "applied_clinical_tags");
        migrationBuilder.DropTable(name: "clinical_drafts");
        migrationBuilder.DropTable(name: "patient_timeline_items");
    }
}
