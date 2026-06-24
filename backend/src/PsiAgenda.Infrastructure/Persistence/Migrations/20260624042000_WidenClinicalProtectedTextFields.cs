using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260624042000_WidenClinicalProtectedTextFields")]
public partial class WidenClinicalProtectedTextFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "session_note",
            table: "clinical_drafts",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(4000)",
            oldMaxLength: 4000,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "content_text",
            table: "clinical_drafts",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(8000)",
            oldMaxLength: 8000);

        migrationBuilder.AlterColumn<string>(
            name: "content_text",
            table: "clinical_records",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(8000)",
            oldMaxLength: 8000);

        migrationBuilder.AlterColumn<string>(
            name: "note",
            table: "applied_clinical_tags",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(500)",
            oldMaxLength: 500,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "case_formulation",
            table: "treatment_plans",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(4000)",
            oldMaxLength: 4000,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "title",
            table: "patient_tasks",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(160)",
            oldMaxLength: 160);

        migrationBuilder.AlterColumn<string>(
            name: "description",
            table: "patient_tasks",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(1000)",
            oldMaxLength: 1000,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "response_text",
            table: "patient_tasks",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(2000)",
            oldMaxLength: 2000,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "title",
            table: "shared_materials",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(160)",
            oldMaxLength: 160);

        migrationBuilder.AlterColumn<string>(
            name: "description",
            table: "shared_materials",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(1200)",
            oldMaxLength: 1200,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "prompt",
            table: "patient_check_ins",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(220)",
            oldMaxLength: 220);

        migrationBuilder.AlterColumn<string>(
            name: "context_note",
            table: "patient_check_ins",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(1000)",
            oldMaxLength: 1000,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "response_text",
            table: "patient_check_ins",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(2000)",
            oldMaxLength: 2000,
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "title",
            table: "clinical_alerts",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(160)",
            oldMaxLength: 160);

        migrationBuilder.AlterColumn<string>(
            name: "description",
            table: "clinical_alerts",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(1200)",
            oldMaxLength: 1200);

        migrationBuilder.AlterColumn<string>(
            name: "review_note",
            table: "clinical_alerts",
            type: "text",
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(500)",
            oldMaxLength: 500,
            oldNullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "session_note",
            table: "clinical_drafts",
            type: "character varying(4000)",
            maxLength: 4000,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "content_text",
            table: "clinical_drafts",
            type: "character varying(8000)",
            maxLength: 8000,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.AlterColumn<string>(
            name: "content_text",
            table: "clinical_records",
            type: "character varying(8000)",
            maxLength: 8000,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.AlterColumn<string>(
            name: "note",
            table: "applied_clinical_tags",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "case_formulation",
            table: "treatment_plans",
            type: "character varying(4000)",
            maxLength: 4000,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "title",
            table: "patient_tasks",
            type: "character varying(160)",
            maxLength: 160,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.AlterColumn<string>(
            name: "description",
            table: "patient_tasks",
            type: "character varying(1000)",
            maxLength: 1000,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "response_text",
            table: "patient_tasks",
            type: "character varying(2000)",
            maxLength: 2000,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "title",
            table: "shared_materials",
            type: "character varying(160)",
            maxLength: 160,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.AlterColumn<string>(
            name: "description",
            table: "shared_materials",
            type: "character varying(1200)",
            maxLength: 1200,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "prompt",
            table: "patient_check_ins",
            type: "character varying(220)",
            maxLength: 220,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.AlterColumn<string>(
            name: "context_note",
            table: "patient_check_ins",
            type: "character varying(1000)",
            maxLength: 1000,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "response_text",
            table: "patient_check_ins",
            type: "character varying(2000)",
            maxLength: 2000,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);

        migrationBuilder.AlterColumn<string>(
            name: "title",
            table: "clinical_alerts",
            type: "character varying(160)",
            maxLength: 160,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.AlterColumn<string>(
            name: "description",
            table: "clinical_alerts",
            type: "character varying(1200)",
            maxLength: 1200,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.AlterColumn<string>(
            name: "review_note",
            table: "clinical_alerts",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "text",
            oldNullable: true);
    }
}
