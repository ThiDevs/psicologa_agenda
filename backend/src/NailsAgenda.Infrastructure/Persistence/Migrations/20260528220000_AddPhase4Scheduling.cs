using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NailsAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(NailsAgendaDbContext))]
[Migration("20260528220000_AddPhase4Scheduling")]
public partial class AddPhase4Scheduling : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "buffer_after_minutes",
            table: "services",
            type: "integer",
            nullable: false,
            defaultValue: 10);

        migrationBuilder.CreateTable(
            name: "service_categories",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_service_categories", x => x.id);
                table.ForeignKey(
                    name: "fk_service_categories_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "space_opening_hours",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                day_of_week = table.Column<int>(type: "integer", nullable: false),
                is_open = table.Column<bool>(type: "boolean", nullable: false),
                start_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                end_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_space_opening_hours", x => x.id);
                table.ForeignKey(
                    name: "fk_space_opening_hours_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "space_payment_settings",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                allow_pix = table.Column<bool>(type: "boolean", nullable: false),
                allow_credit_card = table.Column<bool>(type: "boolean", nullable: false),
                allow_debit_card = table.Column<bool>(type: "boolean", nullable: false),
                allow_pay_on_site = table.Column<bool>(type: "boolean", nullable: false),
                require_pre_payment = table.Column<bool>(type: "boolean", nullable: false),
                require_deposit = table.Column<bool>(type: "boolean", nullable: false),
                deposit_type = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                deposit_value = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                service_fee_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                reservation_expiration_minutes = table.Column<int>(type: "integer", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_space_payment_settings", x => x.id);
                table.ForeignKey(
                    name: "fk_space_payment_settings_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "space_cancellation_policies",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                allow_customer_cancel = table.Column<bool>(type: "boolean", nullable: false),
                free_cancel_before_hours = table.Column<int>(type: "integer", nullable: false),
                allow_reschedule = table.Column<bool>(type: "boolean", nullable: false),
                free_reschedule_before_hours = table.Column<int>(type: "integer", nullable: false),
                charge_late_cancel_fee = table.Column<bool>(type: "boolean", nullable: false),
                late_cancel_fee = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                policy_text = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_space_cancellation_policies", x => x.id);
                table.ForeignKey(
                    name: "fk_space_cancellation_policies_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "blocked_times",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: true),
                date = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                start_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                end_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                reason = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                active = table.Column<bool>(type: "boolean", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_blocked_times", x => x.id);
                table.ForeignKey(
                    name: "fk_blocked_times_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_blocked_times_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "appointments",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                space_id = table.Column<Guid>(type: "uuid", nullable: false),
                professional_id = table.Column<Guid>(type: "uuid", nullable: false),
                any_professional = table.Column<bool>(type: "boolean", nullable: false),
                start_date_time = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                end_date_time = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                total_duration_minutes = table.Column<int>(type: "integer", nullable: false),
                subtotal = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                service_fee = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                total = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                payment_method_id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                payment_status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_appointments", x => x.id);
                table.ForeignKey(
                    name: "fk_appointments_professionals_professional_id",
                    column: x => x.professional_id,
                    principalTable: "professionals",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_appointments_spaces_space_id",
                    column: x => x.space_id,
                    principalTable: "spaces",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_appointments_users_customer_id",
                    column: x => x.customer_id,
                    principalTable: "users",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "appointment_services",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                appointment_id = table.Column<Guid>(type: "uuid", nullable: false),
                service_id = table.Column<Guid>(type: "uuid", nullable: false),
                price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                duration_minutes = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_appointment_services", x => x.id);
                table.ForeignKey(
                    name: "fk_appointment_services_appointments_appointment_id",
                    column: x => x.appointment_id,
                    principalTable: "appointments",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_appointment_services_services_service_id",
                    column: x => x.service_id,
                    principalTable: "services",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_service_categories_space_id_name",
            table: "service_categories",
            columns: new[] { "space_id", "name" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_space_opening_hours_space_id_day_of_week",
            table: "space_opening_hours",
            columns: new[] { "space_id", "day_of_week" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_space_payment_settings_space_id",
            table: "space_payment_settings",
            column: "space_id",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_space_cancellation_policies_space_id",
            table: "space_cancellation_policies",
            column: "space_id",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_blocked_times_professional_id",
            table: "blocked_times",
            column: "professional_id");

        migrationBuilder.CreateIndex(
            name: "ix_blocked_times_space_id_date",
            table: "blocked_times",
            columns: new[] { "space_id", "date" });

        migrationBuilder.CreateIndex(
            name: "ix_appointments_code",
            table: "appointments",
            column: "code",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_appointments_customer_id",
            table: "appointments",
            column: "customer_id");

        migrationBuilder.CreateIndex(
            name: "ix_appointments_professional_id_start_date_time_end_date_time",
            table: "appointments",
            columns: new[] { "professional_id", "start_date_time", "end_date_time" });

        migrationBuilder.CreateIndex(
            name: "ix_appointments_space_id_start_date_time",
            table: "appointments",
            columns: new[] { "space_id", "start_date_time" });

        migrationBuilder.CreateIndex(
            name: "ix_appointment_services_service_id",
            table: "appointment_services",
            column: "service_id");

        migrationBuilder.CreateIndex(
            name: "ix_appointment_services_appointment_id_service_id",
            table: "appointment_services",
            columns: new[] { "appointment_id", "service_id" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "appointment_services");
        migrationBuilder.DropTable(name: "blocked_times");
        migrationBuilder.DropTable(name: "service_categories");
        migrationBuilder.DropTable(name: "space_cancellation_policies");
        migrationBuilder.DropTable(name: "space_opening_hours");
        migrationBuilder.DropTable(name: "space_payment_settings");
        migrationBuilder.DropTable(name: "appointments");

        migrationBuilder.DropColumn(
            name: "buffer_after_minutes",
            table: "services");
    }
}
