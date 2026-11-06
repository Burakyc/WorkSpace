namespace DevPath.Api.Infrastructure.Diagnostics;

/// <summary>One recorded error: where and what, never the message (it can hold user content or a token).</summary>
public sealed record ErrorEntry(DateTimeOffset At, string Source, string Kind, string? Path);

/// <summary>The last <see cref="Capacity"/> errors in memory, for the developer panel. Lost when the API stops.</summary>
public sealed class ErrorBuffer
{
    public const int Capacity = 50;

    private readonly Queue<ErrorEntry> _entries = new();
    private readonly Lock _lock = new();

    public void Add(ErrorEntry entry)
    {
        lock (_lock)
        {
            _entries.Enqueue(entry);
            if (_entries.Count > Capacity)
            {
                _entries.Dequeue();
            }
        }
    }

    /// <summary>Newest first.</summary>
    public IReadOnlyList<ErrorEntry> Recent()
    {
        lock (_lock)
        {
            return _entries.Reverse().ToArray();
        }
    }
}
