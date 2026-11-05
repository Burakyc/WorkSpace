namespace DevPath.Api.Infrastructure.Validation;

/// <summary>Input that breaks a business rule. Errors are keyed by camelCase field name and hold Turkish, user-facing messages.</summary>
public sealed class ValidationException(IReadOnlyDictionary<string, string[]> errors) : Exception("Validation failed.")
{
    public IReadOnlyDictionary<string, string[]> Errors { get; } = errors;
}
