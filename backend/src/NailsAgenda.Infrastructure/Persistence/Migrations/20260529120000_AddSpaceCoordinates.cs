using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NailsAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(NailsAgendaDbContext))]
[Migration("20260529120000_AddSpaceCoordinates")]
public partial class AddSpaceCoordinates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<double>(
            name: "latitude",
            table: "spaces",
            type: "double precision",
            nullable: true);

        migrationBuilder.AddColumn<double>(
            name: "longitude",
            table: "spaces",
            type: "double precision",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "latitude",
            table: "spaces");

        migrationBuilder.DropColumn(
            name: "longitude",
            table: "spaces");
    }
}
