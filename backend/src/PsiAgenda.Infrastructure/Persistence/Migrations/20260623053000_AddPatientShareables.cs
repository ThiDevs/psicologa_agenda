using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623053000_AddPatientShareables")]
public partial class AddPatientShareables : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "patient_tasks",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                accepts_response = table.Column<bool>(type: "boolean", nullable: false),
                shared_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_patient_tasks", x => x.id);
                table.ForeignKey(
                    name: "fk_patient_tasks_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_tasks_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_tasks_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_tasks_users_created_by_user_id",
                    column: x => x.created_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_tasks_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "shared_materials",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                material_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                description = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: true),
                url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                shared_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_shared_materials", x => x.id);
                table.ForeignKey(
                    name: "fk_shared_materials_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_shared_materials_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_shared_materials_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_shared_materials_users_created_by_user_id",
                    column: x => x.created_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_shared_materials_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_patient_tasks_appointment_id_created_at",
            table: "patient_tasks",
            columns: new[] { "appointment_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_tasks_created_by_user_id",
            table: "patient_tasks",
            column: "created_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_tasks_patient_id_professional_id_status",
            table: "patient_tasks",
            columns: new[] { "patient_id", "professional_id", "status" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_tasks_professional_id",
            table: "patient_tasks",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_tasks_space_id",
            table: "patient_tasks",
            column: "space_id");

        migrationBuilder.CreateIndex(
            name: "ix_shared_materials_appointment_id_created_at",
            table: "shared_materials",
            columns: new[] { "appointment_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_shared_materials_created_by_user_id",
            table: "shared_materials",
            column: "created_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_shared_materials_patient_id_professional_id_status",
            table: "shared_materials",
            columns: new[] { "patient_id", "professional_id", "status" });

        migrationBuilder.CreateIndex(
            name: "ix_shared_materials_professional_id",
            table: "shared_materials",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_shared_materials_space_id",
            table: "shared_materials",
            column: "space_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "patient_tasks");
        migrationBuilder.DropTable(name: "shared_materials");
    }
}
