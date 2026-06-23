using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623043000_AddClinicalDraftRectifications")]
public partial class AddClinicalDraftRectifications : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "record_type",
            table: "clinical_drafts",
            type: "character varying(40)",
            maxLength: 40,
            nullable: false,
            defaultValue: "session_evolution");

        migrationBuilder.AddColumn<Guid>(
            name: "previous_record_id",
            table: "clinical_drafts",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "ix_clinical_drafts_previous_record_id",
            table: "clinical_drafts",
            column: "previous_record_id");

        migrationBuilder.AddForeignKey(
            name: "fk_clinical_drafts_clinical_records_previous_record_id",
            table: "clinical_drafts",
            column: "previous_record_id",
            principalTable: "clinical_records",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "fk_clinical_drafts_clinical_records_previous_record_id",
            table: "clinical_drafts");

        migrationBuilder.DropIndex(
            name: "ix_clinical_drafts_previous_record_id",
            table: "clinical_drafts");

        migrationBuilder.DropColumn(
            name: "previous_record_id",
            table: "clinical_drafts");

        migrationBuilder.DropColumn(
            name: "record_type",
            table: "clinical_drafts");
    }
}
