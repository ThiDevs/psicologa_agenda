using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623063000_AddPatientCheckIns")]
public partial class AddPatientCheckIns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "patient_check_ins",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                prompt = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: false),
                context_note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                due_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                mood_score = table.Column<int>(type: "integer", nullable: true),
                response_text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                responded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                shared_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_patient_check_ins", x => x.id);
                table.ForeignKey(
                    name: "fk_patient_check_ins_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_check_ins_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_check_ins_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_check_ins_users_created_by_user_id",
                    column: x => x.created_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_patient_check_ins_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_patient_check_ins_appointment_id_created_at",
            table: "patient_check_ins",
            columns: new[] { "appointment_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_check_ins_created_by_user_id",
            table: "patient_check_ins",
            column: "created_by_user_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_check_ins_patient_id_professional_id_status",
            table: "patient_check_ins",
            columns: new[] { "patient_id", "professional_id", "status" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_check_ins_professional_id",
            table: "patient_check_ins",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_patient_check_ins_space_id",
            table: "patient_check_ins",
            column: "space_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "patient_check_ins");
    }
}
