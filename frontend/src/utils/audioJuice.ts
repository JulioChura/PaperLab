// Sound effects completely disabled
class AudioJuiceManager {
  public toggleMute(): boolean { return true; }
  public getMuted(): boolean { return true; }
  public setMuted(_muted: boolean): void {}
  public playTap(): void {}
  public playPaperFlip(): void {}
  public playLaserScan(): void {}
  public playSpark(): void {}
}

export const audioJuice = new AudioJuiceManager();
