using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NailsAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(NailsAgendaDbContext))]
[Migration("20260529010000_AddPhase5Operations")]
public partial class AddPhase5Operations : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "email",
            table: "professionals",
            type: "character varying(220)",
            maxLength: 220,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "space_notification_settings",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                notify_customer_on_booking = table.Column<bool>(type: "boolean", nullable: false),
                notify_customer_on_cancel = table.Column<bool>(type: "boolean", nullable: false),
                notify_customer_on_reschedule = table.Column<bool>(type: "boolean", nullable: false),
                notify_owner_on_booking = table.Column<bool>(type: "boolean", nullable: false),
                notify_professional_on_booking = table.Column<bool>(type: "boolean", nullable: false),
                reminder_hours_before = table.Column<int>(type: "integer", nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_space_notification_settings", x => x.id);
                table.ForeignKey(
                    name: "fk_space_notification_settings_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "space_photos",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                caption = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                sort_order = table.Column<int>(type: "integer", nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_space_photos", x => x.id);
                table.ForeignKey(
                    name: "fk_space_photos_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "notifications",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                user_id = table.Column<Guid>(type: "uuid", nullable: true),
                space_id = table.Column<Guid>(type: "uuid", nullable: true),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                title = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: false),
                message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                read = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_notifications", x => x.id);
                table.ForeignKey(
                    name: "fk_notifications_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_notifications_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_notifications_users_user_id",
                    column: x => x.user_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            name: "reviews",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                rating = table.Column<int>(type: "integer", nullable: false),
                comment = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_reviews", x => x.id);
                table.ForeignKey(
                    name: "fk_reviews_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_reviews_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_reviews_users_customer_id",
                    column: x => x.customer_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_professionals_space_id_email",
            table: "professionals",
            columns: new[] { "space_id", "email" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_space_notification_settings_space_id",
            table: "space_notification_settings",
            column: "space_id",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_space_photos_space_id_sort_order",
            table: "space_photos",
            columns: new[] { "space_id", "sort_order" });

        migrationBuilder.CreateIndex(
            name: "ix_notifications_appointment_id",
            table: "notifications",
            column: "appointment_id");

        migrationBuilder.CreateIndex(
            name: "ix_notifications_space_id_created_at",
            table: "notifications",
            columns: new[] { "space_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_notifications_user_id_created_at",
            table: "notifications",
            columns: new[] { "user_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "ix_reviews_appointment_id",
            table: "reviews",
            column: "appointment_id",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_reviews_customer_id",
            table: "reviews",
            column: "customer_id");

        migrationBuilder.CreateIndex(
            name: "ix_reviews_space_id_created_at",
            table: "reviews",
            columns: new[] { "space_id", "created_at" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "notifications");
        migrationBuilder.DropTable(name: "reviews");
        migrationBuilder.DropTable(name: "space_notification_settings");
        migrationBuilder.DropTable(name: "space_photos");

        migrationBuilder.DropIndex(
            name: "ix_professionals_space_id_email",
            table: "professionals");

        migrationBuilder.DropColumn(
            name: "email",
            table: "professionals");
    }
}
