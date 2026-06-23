using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623070000_AddTimelineItemArchiving")]
public partial class AddTimelineItemArchiving : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "archived",
            table: "patient_timeline_items",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "archived_at",
            table: "patient_timeline_items",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "archived_by_user_id",
            table: "patient_timeline_items",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "archive_reason",
            table: "patient_timeline_items",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "ix_patient_timeline_items_archived_by_user_id",
            table: "patient_timeline_items",
            column: "archived_by_user_id");

        migrationBuilder.AddForeignKey(
            name: "fk_patient_timeline_items_users_archived_by_user_id",
            table: "patient_timeline_items",
            column: "archived_by_user_id",
            principalTable: "users",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "fk_patient_timeline_items_users_archived_by_user_id",
            table: "patient_timeline_items");

        migrationBuilder.DropIndex(
            name: "ix_patient_timeline_items_archived_by_user_id",
            table: "patient_timeline_items");

        migrationBuilder.DropColumn(
            name: "archived",
            table: "patient_timeline_items");

        migrationBuilder.DropColumn(
            name: "archived_at",
            table: "patient_timeline_items");

        migrationBuilder.DropColumn(
            name: "archived_by_user_id",
            table: "patient_timeline_items");

        migrationBuilder.DropColumn(
            name: "archive_reason",
            table: "patient_timeline_items");
    }
}
