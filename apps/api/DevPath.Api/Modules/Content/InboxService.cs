using System.Text;
using DevPath.Api.Infrastructure.Validation;
using DevPath.Api.Modules.Settings;

namespace DevPath.Api.Modules.Content;

/// <summary>One listed file: no errors means it can be imported.</summary>
public sealed record InboxFile(string Name, IReadOnlyList<ImportError> Errors);

/// <summary>A module's inbox: <see cref="Folder"/> is null when none is chosen; <see cref="OtherTypeCount"/> counts files of another known type, which are left alone.</summary>
public sealed record InboxScan(string? Folder, string? Error, IReadOnlyList<InboxFile> Files, int OtherTypeCount);

/// <summary>One file of an import. <see cref="Report"/> is set when it was saved; <see cref="Moved"/> when it went to done/.</summary>
public sealed record InboxImportResult(string Name, ImportReport? Report, IReadOnlyList<ImportError> Errors, bool Moved);

public sealed record InboxImport(IReadOnlyList<InboxImportResult> Results);

/// <summary>The file mode: JSON files in a module's inbox folder, listed and imported on demand.</summary>
public sealed class InboxService(SettingsService settings, ImportService imports, TimeProvider time)
{
    private const string ReportSuffix = ".errors.txt";
    private const string Unreadable = "Dosya okunamadı.";

    private static readonly UTF8Encoding StrictUtf8 = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    public async Task<InboxScan> ScanAsync(string module, string? type, CancellationToken cancellationToken)
    {
        var contentType = ContentType.Require(type);
        var folder = await FolderAsync(module, cancellationToken);
        if (folder is null)
        {
            return new InboxScan(null, null, [], 0);
        }
        if (!Directory.Exists(folder))
        {
            return new InboxScan(folder, "Klasör bulunamadı.", [], 0);
        }

        var files = new List<InboxFile>();
        var otherTypes = 0;
        foreach (var name in JsonFileNames(folder).Order(StringComparer.Ordinal))
        {
            var path = Path.Combine(folder, name);
            var (text, readError) = await ReadAsync(path, cancellationToken);
            if (text is not null && ContentType.Find(ImportValidator.ReadType(text)) is { } found && found.Name != contentType.Name)
            {
                otherTypes++;
                continue;
            }

            var errors = readError is not null ? [readError] : ImportValidator.Validate(contentType, text).Errors;
            WriteReport(path, errors);
            files.Add(new InboxFile(name, errors));
        }

        RemoveOrphanReports(folder);
        return new InboxScan(folder, null, files, otherTypes);
    }

    /// <summary>
    /// Imports the named files one by one; one failing never stops the others. The merge comes before the move:
    /// after a failed move, importing the file again only skips what is already there.
    /// </summary>
    public async Task<InboxImport> ImportAsync(string module, string? type, IReadOnlyList<string> names, CancellationToken cancellationToken)
    {
        var contentType = ContentType.Require(type);
        var folder = await FolderAsync(module, cancellationToken);
        // Only names found in the folder listing are used, so no name can reach outside it.
        var known = folder is not null && Directory.Exists(folder)
            ? JsonFileNames(folder).ToHashSet(StringComparer.Ordinal)
            : [];
        var results = new List<InboxImportResult>();
        foreach (var name in names)
        {
            if (!known.Contains(name))
            {
                results.Add(new InboxImportResult(name, null, [new ImportError("", null, "Dosya bulunamadı.")], false));
                continue;
            }

            results.Add(await ImportFileAsync(contentType, Path.Combine(folder!, name), name, cancellationToken));
        }

        return new InboxImport(results);
    }

    private async Task<InboxImportResult> ImportFileAsync(ContentType contentType, string path, string name, CancellationToken cancellationToken)
    {
        var (text, readError) = await ReadAsync(path, cancellationToken);
        if (readError is not null)
        {
            WriteReport(path, [readError]);
            return new InboxImportResult(name, null, [readError], false);
        }

        var result = await imports.ImportAsync(contentType.Name, text, cancellationToken);
        if (result.Report is null)
        {
            WriteReport(path, result.Errors);
            return new InboxImportResult(name, null, result.Errors, false);
        }

        if (!TryMoveToDone(path))
        {
            return new InboxImportResult(name, result.Report, [new ImportError("", null, "Dosya taşınamadı.")], false);
        }

        WriteReport(path, []);
        return new InboxImportResult(name, result.Report, [], true);
    }

    /// <summary>Moves to done/ next to the file, never over an existing file: a clash gets a local timestamp, then -2, -3…</summary>
    private bool TryMoveToDone(string path)
    {
        try
        {
            var done = Path.Combine(Path.GetDirectoryName(path)!, "done");
            Directory.CreateDirectory(done);
            var stem = Path.GetFileNameWithoutExtension(path);
            var target = Path.Combine(done, Path.GetFileName(path));
            if (File.Exists(target))
            {
                var stamped = $"{stem}-{time.GetLocalNow():yyyyMMdd-HHmmss}";
                target = Path.Combine(done, $"{stamped}.json");
                for (var n = 2; File.Exists(target); n++)
                {
                    target = Path.Combine(done, $"{stamped}-{n}.json");
                }
            }

            File.Move(path, target, overwrite: false);
            return true;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return false;
        }
    }

    private async Task<string?> FolderAsync(string module, CancellationToken cancellationToken)
    {
        var inbox = (await settings.GetAsync(cancellationToken)).AiInbox;
        return inbox.TryGetValue(module, out var folder)
            ? folder
            : throw new ValidationException(new Dictionary<string, string[]> { ["module"] = ["Bilinmeyen modül."] });
    }

    /// <summary>Plain names of the *.json files directly in the folder; anything else is never touched.</summary>
    private static IEnumerable<string> JsonFileNames(string folder) =>
        Directory.EnumerateFiles(folder, "*.json").Select(path => Path.GetFileName(path));

    /// <summary>The file's text, or the problem. Strict UTF-8, so a broken file is never saved with replacement characters.</summary>
    private static async Task<(string? Text, ImportError? Error)> ReadAsync(string path, CancellationToken cancellationToken)
    {
        try
        {
            if (new FileInfo(path).Length > ImportValidator.MaxBytes)
            {
                return (null, new ImportError("", null, "Dosya 2 MB'tan büyük olamaz."));
            }

            var bytes = await File.ReadAllBytesAsync(path, cancellationToken);
            var body = bytes.AsSpan().StartsWith(Encoding.UTF8.Preamble) ? bytes[Encoding.UTF8.Preamble.Length..] : bytes;
            return (StrictUtf8.GetString(body), null);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or DecoderFallbackException)
        {
            return (null, new ImportError("", null, Unreadable));
        }
    }

    /// <summary>The report next to the file, or none when the file is valid. It is only an extra, so a failure is ignored.</summary>
    private static void WriteReport(string path, IReadOnlyList<ImportError> errors) => Try(() =>
    {
        if (errors.Count == 0)
        {
            File.Delete(path + ReportSuffix);
            return;
        }

        File.WriteAllLines(path + ReportSuffix, errors.Select(error =>
        {
            var where = error.Path == "" ? error.Message : $"{error.Path}: {error.Message}";
            return error.Line is { } line ? $"Satır {line} · {where}" : where;
        }));
    });

    private static void RemoveOrphanReports(string folder) => Try(() =>
    {
        foreach (var report in Directory.EnumerateFiles(folder, "*.json" + ReportSuffix))
        {
            if (!File.Exists(report[..^ReportSuffix.Length]))
            {
                File.Delete(report);
            }
        }
    });

    private static void Try(Action action)
    {
        try
        {
            action();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // ponytail: a locked or read-only report is not worth failing over; the list still shows the errors.
        }
    }
}
