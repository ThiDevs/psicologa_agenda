using PsiAgenda.Application.Clinical;

namespace PsiAgenda.Infrastructure.Services;

public interface IClinicalTextProtector
{
    string ProtectRequired(string value);
    string? ProtectOptional(string? value);
    string UnprotectRequired(string value);
    string? UnprotectOptional(string? value);
    bool IsProtected(string? value);
    ClinicalDataProtectionPolicyDto BuildPolicy();
}
