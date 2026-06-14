using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260528000000_InitialCreate")]
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "spaces",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                description = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                whatsapp = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                address = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                neighborhood = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                city = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                state = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                zip_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                active = table.Column<bool>(type: "boolean", nullable: false),
                published = table.Column<bool>(type: "boolean", nullable: false),
                onboarding_completed = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_spaces", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "users",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                email = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: false),
                phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                password_hash = table.Column<string>(type: "text", nullable: false),
                role = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_users", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "audit_logs",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                user_id = table.Column<Guid>(type: "uuid", nullable: true),
                space_id = table.Column<Guid>(type: "uuid", nullable: true),
                action = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                entity = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                entity_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                metadata_json = table.Column<string>(type: "jsonb", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_audit_logs", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "refresh_tokens",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                user_id = table.Column<Guid>(type: "uuid", nullable: false),
                token_hash = table.Column<string>(type: "text", nullable: false),
                expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                revoked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_refresh_tokens", x => x.id);
                table.ForeignKey(
                    name: "fk_refresh_tokens_users_user_id",
                    column: x => x.user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "space_users",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                user_id = table.Column<Guid>(type: "uuid", nullable: false),
                role = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_space_users", x => x.id);
                table.ForeignKey(
                    name: "fk_space_users_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_space_users_users_user_id",
                    column: x => x.user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "ix_audit_logs_space_id_created_at",
            table: "audit_logs",
            columns: new[] { "space_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_refresh_tokens_token_hash",
            table: "refresh_tokens",
            column: "token_hash",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_refresh_tokens_user_id",
            table: "refresh_tokens",
            column: "user_id");

        migrationBuilder.CreateIndex(
            name: "ix_space_users_space_id_user_id",
            table: "space_users",
            columns: new[] { "space_id", "user_id" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_space_users_user_id",
            table: "space_users",
            column: "user_id");

        migrationBuilder.CreateIndex(
            name: "ix_users_email",
            table: "users",
            column: "email",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "audit_logs");
        migrationBuilder.DropTable(name: "refresh_tokens");
        migrationBuilder.DropTable(name: "space_users");
        migrationBuilder.DropTable(name: "spaces");
        migrationBuilder.DropTable(name: "users");
    }
}
