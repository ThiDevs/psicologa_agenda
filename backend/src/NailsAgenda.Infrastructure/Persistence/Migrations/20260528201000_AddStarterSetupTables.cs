using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NailsAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(NailsAgendaDbContext))]
[Migration("20260528201000_AddStarterSetupTables")]
public partial class AddStarterSetupTables : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "services",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                description = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                duration_minutes = table.Column<int>(type: "integer", nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                online_booking = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_services", x => x.id);
                table.ForeignKey(
                    name: "fk_services_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "professionals",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                specialty = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                experience_years = table.Column<int>(type: "integer", nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_professionals", x => x.id);
                table.ForeignKey(
                    name: "fk_professionals_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "professional_services",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                service_id = table.Column<Guid>(type: "uuid", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_professional_services", x => x.id);
                table.ForeignKey(
                    name: "fk_professional_services_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_professional_services_services_service_id",
                    column: x => x.service_id,
                    principalTable: "services",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "professional_schedules",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                day_of_week = table.Column<int>(type: "integer", nullable: false),
                start_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                end_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                break_start_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                break_end_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                active = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_professional_schedules", x => x.id);
                table.ForeignKey(
                    name: "fk_professional_schedules_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "ix_professional_schedules_professional_id_day_of_week",
            table: "professional_schedules",
            columns: new[] { "professional_id", "day_of_week" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_professional_services_professional_id_service_id",
            table: "professional_services",
            columns: new[] { "professional_id", "service_id" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_professional_services_service_id",
            table: "professional_services",
            column: "service_id");

        migrationBuilder.CreateIndex(
            name: "ix_professionals_space_id_active",
            table: "professionals",
            columns: new[] { "space_id", "active" });

        migrationBuilder.CreateIndex(
            name: "ix_services_space_id_active",
            table: "services",
            columns: new[] { "space_id", "active" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "professional_schedules");
        migrationBuilder.DropTable(name: "professional_services");
        migrationBuilder.DropTable(name: "professionals");
        migrationBuilder.DropTable(name: "services");
    }
}
