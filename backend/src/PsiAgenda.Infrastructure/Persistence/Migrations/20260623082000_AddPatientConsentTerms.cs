using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsiAgenda.Infrastructure.Persistence.Migrations;

[DbContextAttribute(typeof(PsiAgendaDbContext))]
[Migration("20260623082000_AddPatientConsentTerms")]
public partial class AddPatientConsentTerms : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "patient_consent_terms",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                consent_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                version = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                title = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: false),
                summary = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                legal_basis = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                retention_policy = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                review_notice = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                sensitive = table.Column<bool>(type: "boolean", nullable: false),
                requires_explicit_patient_decision = table.Column<bool>(type: "boolean", nullable: false),
                is_active = table.Column<bool>(type: "boolean", nullable: false),
                effective_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                retired_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_patient_consent_terms", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_terms_consent_type_is_active",
            table: "patient_consent_terms",
            columns: new[] { "consent_type", "is_active" });

        migrationBuilder.CreateIndex(
            name: "ix_patient_consent_terms_consent_type_version",
            table: "patient_consent_terms",
            columns: new[] { "consent_type", "version" },
            unique: true);

        migrationBuilder.Sql(
            """
            insert into patient_consent_terms (
                id,
                consent_type,
                version,
                title,
                summary,
                legal_basis,
                retention_policy,
                review_notice,
                sensitive,
                requires_explicit_patient_decision,
                is_active,
                effective_at,
                retired_at,
                created_at,
                updated_at
            )
            values
                (gen_random_uuid(), 'portal', 'clinical-consent-v1', 'Portal do paciente', 'Permite acessar a area Meu acompanhamento para ver itens liberados pela psicologa.', 'Consentimento granular do paciente para acompanhamento digital.', 'Pode ser revogado a qualquer momento; eventos tecnicos permanecem para rastreabilidade e auditoria.', 'Texto operacional pendente de revisao juridica final.', false, false, true, '2026-06-23T00:00:00Z', null, '2026-06-23T00:00:00Z', '2026-06-23T00:00:00Z'),
                (gen_random_uuid(), 'materials', 'clinical-consent-v1', 'Materiais compartilhados', 'Permite receber materiais educativos ou combinados de cuidado escolhidos pela psicologa.', 'Consentimento granular do paciente para compartilhamento de materiais.', 'Pode ser revogado a qualquer momento; materiais ja compartilhados podem ser recolhidos pela psicologa.', 'Texto operacional pendente de revisao juridica final.', false, false, true, '2026-06-23T00:00:00Z', null, '2026-06-23T00:00:00Z', '2026-06-23T00:00:00Z'),
                (gen_random_uuid(), 'checkins', 'clinical-consent-v1', 'Check-ins entre sessoes', 'Permite responder check-ins de acompanhamento quando a psicologa compartilhar uma pergunta.', 'Consentimento granular do paciente para acompanhamento entre sessoes.', 'Pode ser revogado a qualquer momento; respostas ja enviadas seguem preservadas para cuidado e auditoria.', 'Texto operacional pendente de revisao juridica final.', false, false, true, '2026-06-23T00:00:00Z', null, '2026-06-23T00:00:00Z', '2026-06-23T00:00:00Z'),
                (gen_random_uuid(), 'notifications', 'clinical-consent-v1', 'Notificacoes do cuidado', 'Permite receber avisos operacionais relacionados ao acompanhamento liberado.', 'Consentimento granular do paciente para comunicacoes operacionais.', 'Pode ser revogado a qualquer momento; registros tecnicos de envio podem permanecer para auditoria.', 'Texto operacional pendente de revisao juridica final.', false, false, true, '2026-06-23T00:00:00Z', null, '2026-06-23T00:00:00Z', '2026-06-23T00:00:00Z'),
                (gen_random_uuid(), 'ai_analysis', 'clinical-sensitive-consent-v1', 'Apoio de IA', 'Permite usar IA somente como apoio a rascunhos e sugestoes revisadas manualmente pela psicologa.', 'Consentimento explicito do paciente para apoio computacional em finalidade clinica delimitada.', 'Pode ser recusado ou revogado; sem consentimento ativo, IA permanece bloqueada.', 'Texto sensivel exige revisao juridica antes de uso em producao.', true, true, true, '2026-06-23T00:00:00Z', null, '2026-06-23T00:00:00Z', '2026-06-23T00:00:00Z'),
                (gen_random_uuid(), 'recording', 'clinical-sensitive-consent-v1', 'Gravacao de sessao', 'Permite gravar sessao ou chamada apenas quando esse recurso estiver disponivel e explicitamente autorizado.', 'Consentimento explicito do paciente para gravacao em finalidade clinica delimitada.', 'Pode ser recusado ou revogado; sem consentimento ativo, gravacao permanece bloqueada.', 'Texto sensivel exige revisao juridica antes de uso em producao.', true, true, true, '2026-06-23T00:00:00Z', null, '2026-06-23T00:00:00Z', '2026-06-23T00:00:00Z'),
                (gen_random_uuid(), 'transcription', 'clinical-sensitive-consent-v1', 'Transcricao de audio', 'Permite transcrever audio somente como apoio clinico revisado manualmente pela psicologa.', 'Consentimento explicito do paciente para transcricao em finalidade clinica delimitada.', 'Pode ser recusado ou revogado; sem consentimento ativo, transcricao permanece bloqueada.', 'Texto sensivel exige revisao juridica antes de uso em producao.', true, true, true, '2026-06-23T00:00:00Z', null, '2026-06-23T00:00:00Z', '2026-06-23T00:00:00Z');
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "patient_consent_terms");
    }
}
