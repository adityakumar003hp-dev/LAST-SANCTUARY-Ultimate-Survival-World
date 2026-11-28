import { soundEngine } from '../../utils/audio';

export interface StationAnnouncement {
  id: string;
  hindiText: string;
  englishText: string;
  regionalText?: string;
  trainNumber?: string;
  trainName?: string;
  platformNumber?: number;
  type: 'arrival' | 'departure' | 'delay' | 'security' | 'boarding' | 'facility';
  timestamp: number;
}

export class MultilingualAnnouncementSystem {
  private currentAnnouncement: StationAnnouncement | null = null;
  private announcementQueue: StationAnnouncement[] = [];
  private isPlaying: boolean = false;
  private displayTimer: number = 0;
  private speechUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Array<(announcement: StationAnnouncement | null) => void> = [];

  constructor() {}

  public subscribe(cb: (announcement: StationAnnouncement | null) => void): () => void {
    this.listeners.push(cb);
    cb(this.currentAnnouncement);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.currentAnnouncement);
    }
  }

  public announceTrainArrival(trainNumber: string, trainName: string, source: string, dest: string, platform: number): void {
    const hindi = `कृपया ध्यान दीजिए, गाड़ी संख्या ${trainNumber}, ${trainName}, ${source} से चलकर ${dest} को जाने वाली, प्लेटफार्म क्रमांक ${platform} पर आ रही है।`;
    const english = `May I have your attention please: Train Number ${trainNumber}, ${trainName}, from ${source} to ${dest}, is arriving shortly on Platform Number ${platform}.`;
    const regional = `लक्ष द्या, गाडी क्रमांक ${trainNumber}, ${trainName}, फलाट क्रमांक ${platform} वर येत आहे.`;

    this.queueAnnouncement({
      id: `arr_${Date.now()}_${trainNumber}`,
      hindiText: hindi,
      englishText: english,
      regionalText: regional,
      trainNumber,
      trainName,
      platformNumber: platform,
      type: 'arrival',
      timestamp: Date.now(),
    });
  }

  public announceTrainDeparture(trainNumber: string, trainName: string, dest: string, platform: number): void {
    const hindi = `यात्रीगण कृपया ध्यान दें, गाड़ी संख्या ${trainNumber}, ${trainName}, ${dest} के लिए प्लेटफार्म क्रमांक ${platform} से प्रस्थान करने के लिए तैयार है।`;
    const english = `Attention please: Train Number ${trainNumber}, ${trainName}, for ${dest}, is ready for departure from Platform Number ${platform}.`;

    this.queueAnnouncement({
      id: `dep_${Date.now()}_${trainNumber}`,
      hindiText: hindi,
      englishText: english,
      trainNumber,
      trainName,
      platformNumber: platform,
      type: 'departure',
      timestamp: Date.now(),
    });
  }

  public announceSecurityNotice(): void {
    const hindi = `सुरक्षा सूचना: लावारिस वस्तुओं को हाथ न लगाएं। किसी भी संदिग्ध गतिविधि की सूचना तुरंत रेलवे सुरक्षा बल (RPF) को दें। हेल्पलाइन 139।`;
    const english = `Security Announcement: Do not touch any unattended luggage or suspicious objects. Report immediately to Railway Protection Force (RPF) or dial helpline 139.`;

    this.queueAnnouncement({
      id: `sec_${Date.now()}`,
      hindiText: hindi,
      englishText: english,
      type: 'security',
      timestamp: Date.now(),
    });
  }

  public queueAnnouncement(announcement: StationAnnouncement): void {
    this.announcementQueue.push(announcement);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playNext(): void {
    if (this.announcementQueue.length === 0) {
      this.currentAnnouncement = null;
      this.isPlaying = false;
      this.notify();
      return;
    }

    this.isPlaying = true;
    this.currentAnnouncement = this.announcementQueue.shift()!;
    this.displayTimer = 9.0;
    this.notify();

    // Play Indian Railways iconic station chime
    try {
      soundEngine.playStationChime();
    } catch {}

    // Use Web Speech API if supported and enabled in browser
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(this.currentAnnouncement.englishText);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 0.85;
        utterance.onend = () => {
          // Finished utterance
        };
        this.speechUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  }

  public update(dt: number): void {
    if (this.currentAnnouncement) {
      this.displayTimer -= dt;
      if (this.displayTimer <= 0) {
        this.playNext();
      }
    }
  }

  public getCurrent(): StationAnnouncement | null {
    return this.currentAnnouncement;
  }
}

export const stationAnnouncementSystem = new MultilingualAnnouncementSystem();
