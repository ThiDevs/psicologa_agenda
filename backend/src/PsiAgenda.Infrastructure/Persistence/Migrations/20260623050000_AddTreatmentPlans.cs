using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623050000_AddTreatmentPlans")]
public partial class AddTreatmentPlans : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "treatment_plans",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                updated_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                case_formulation = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                goals_json = table.Column<string>(type: "jsonb", nullable: true),
                strategies_json = table.Column<string>(type: "jsonb", nullable: true),
                obstacles_json = table.Column<string>(type: "jsonb", nullable: true),
                review_cadence = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_treatment_plans", x => x.id);
                table.ForeignKey(
                    name: "fk_treatment_plans_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_treatment_plans_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_treatment_plans_users_patient_id",
                    column: x => x.patient_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_treatment_plans_users_updated_by_user_id",
                    column: x => x.updated_by_user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_treatment_plans_patient_id_professional_id",
            table: "treatment_plans",
            columns: new[] { "patient_id", "professional_id" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_treatment_plans_professional_id_status",
            table: "treatment_plans",
            columns: new[] { "professional_id", "status" });

        migrationBuilder.CreateIndex(
            name: "ix_treatment_plans_space_id",
            table: "treatment_plans",
            column: "space_id");

        migrationBuilder.CreateIndex(
            name: "ix_treatment_plans_updated_by_user_id",
            table: "treatment_plans",
            column: "updated_by_user_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "treatment_plans");
    }
}
