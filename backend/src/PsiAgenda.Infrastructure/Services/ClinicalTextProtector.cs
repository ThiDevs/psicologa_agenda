using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using PsiAgenda.Application.Clinical;

namespace PsiAgenda.Infrastructure.Services;

public sealed class ClinicalTextProtector(IOptions<ClinicalDataProtectionOptions> options) : IClinicalTextProtector
{
    private const string EnvelopePrefix = "enc:v1:";
    private const int NonceSizeBytes = 12;
    private const int TagSizeBytes = 16;
    private const string DevelopmentFallbackKey = "dev-only-clinical-data-protection-key-change-in-production";
    private static readonly byte[] AssociatedData = Encoding.UTF8.GetBytes("psi-agenda:clinical-text:v1");
    private static readonly IReadOnlyList<string> ProtectedFields =
    [
        "clinical_drafts.session_note",
        "clinical_drafts.content_text",
        "clinical_records.content_text",
        "applied_clinical_tags.note",
        "treatment_plans.case_formulation",
        "patient_tasks.title",
        "patient_tasks.description",
        "patient_tasks.response_text",
        "shared_materials.title",
        "shared_materials.description",
        "patient_check_ins.prompt",
        "patient_check_ins.context_note",
        "patient_check_ins.response_text",
        "clinical_alerts.title",
        "clinical_alerts.description",
        "clinical_alerts.review_note"
    ];

    private readonly byte[] key = DeriveKey(options.Value.Key);
    private readonly bool hasConfiguredKey = !string.IsNullOrWhiteSpace(options.Value.Key);

    public string ProtectRequired(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException("Conteúdo clínico obrigatório não pode ficar vazio.");
        }

        return Protect(value);
    }

    public string? ProtectOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? value : Protect(value);
    }

    public string UnprotectRequired(string value)
    {
        var unprotected = UnprotectOptional(value);
        if (string.IsNullOrWhiteSpace(unprotected))
        {
            throw new InvalidOperationException("Conteúdo clínico obrigatório não pode ficar vazio.");
        }

        return unprotected;
    }

    public string? UnprotectOptional(string? value)
    {
        if (!IsProtected(value))
        {
            return value;
        }

        var envelope = value![EnvelopePrefix.Length..].Split(':');
        if (envelope.Length != 3)
        {
            throw new InvalidOperationException("Envelope de conteúdo clínico inválido.");
        }

        try
        {
            var nonce = Convert.FromBase64String(envelope[0]);
            var tag = Convert.FromBase64String(envelope[1]);
            var cipherText = Convert.FromBase64String(envelope[2]);
            var plainText = new byte[cipherText.Length];

            using var aes = new AesGcm(key, TagSizeBytes);
            aes.Decrypt(nonce, cipherText, tag, plainText, AssociatedData);

            return Encoding.UTF8.GetString(plainText);
        }
        catch (FormatException exception)
        {
            throw new InvalidOperationException("Envelope de conteúdo clínico inválido.", exception);
        }
        catch (CryptographicException exception)
        {
            throw new InvalidOperationException("Conteúdo clínico protegido não pôde ser descriptografado.", exception);
        }
    }

    public bool IsProtected(string? value)
    {
        return value?.StartsWith(EnvelopePrefix, StringComparison.Ordinal) == true;
    }

    public ClinicalDataProtectionPolicyDto BuildPolicy()
    {
        return new ClinicalDataProtectionPolicyDto(
            true,
            "AES-256-GCM envelope enc:v1",
            hasConfiguredKey ? "configured" : "development_fallback",
            true,
            ProtectedFields,
            hasConfiguredKey ? "active" : "active_with_development_key",
            hasConfiguredKey
                ? "Rotação de chave deve ser feita com migração planejada dos envelopes enc:v1."
                : "Configure ClinicalDataProtection:Key em produção antes de armazenar conteúdo clínico real.");
    }

    private string Protect(string value)
    {
        if (IsProtected(value))
        {
            return value;
        }

        var nonce = RandomNumberGenerator.GetBytes(NonceSizeBytes);
        var plainText = Encoding.UTF8.GetBytes(value);
        var cipherText = new byte[plainText.Length];
        var tag = new byte[TagSizeBytes];

        using var aes = new AesGcm(key, TagSizeBytes);
        aes.Encrypt(nonce, plainText, cipherText, tag, AssociatedData);

        return $"{EnvelopePrefix}{Convert.ToBase64String(nonce)}:{Convert.ToBase64String(tag)}:{Convert.ToBase64String(cipherText)}";
    }

    private static byte[] DeriveKey(string? configuredKey)
    {
        var source = string.IsNullOrWhiteSpace(configuredKey)
            ? DevelopmentFallbackKey
            : configuredKey.Trim();

        return SHA256.HashData(Encoding.UTF8.GetBytes(source));
    }
}
