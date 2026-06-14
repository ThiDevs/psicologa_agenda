using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260614090000_AddAppointmentOwnerDecisionAndOnlineRoom")]
public partial class AddAppointmentOwnerDecisionAndOnlineRoom : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "owner_decision_reason",
            table: "appointments",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "owner_decision_at",
            table: "appointments",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "online_room_url",
            table: "appointments",
            type: "character varying(2048)",
            maxLength: 2048,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "owner_decision_reason",
            table: "appointments");

        migrationBuilder.DropColumn(
            name: "owner_decision_at",
            table: "appointments");

        migrationBuilder.DropColumn(
            name: "online_room_url",
            table: "appointments");
    }
}
