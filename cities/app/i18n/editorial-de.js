// German editorial variants keyed by stable editorial IDs. Source citations,
// official names, dates, figures and URLs always come from the original data.
export const signals = {
  'monthey-strategie-numerique-2026': {
    title: 'CHF 1,703 Millionen für die Digitalstrategie vorgesehen',
    summary: 'Die offizielle Finanzplanung 2026–2029 führt einen Verpflichtungskredit «Informatik, Umsetzung der Digitalstrategie» von CHF 1’703’000 auf, verteilt auf mehrere Rechnungsjahre.',
    why: 'Der Betrag belegt ein weiterhin laufendes, bedeutendes Digitalvorhaben. Er beweist für sich genommen keinen ERP-Wechsel. Zu klären sind Umfang, Zeitplan, betroffene Lösungen und allfällige noch offene Beschaffungen.',
    tags: ['Öffentliches Budget', 'Digitalstrategie', 'Abzuklären']
  },
  'yverdon-sey-normes-tic-2026': {
    title: 'CHF 780’000 für die Cybersicherheit der Energieversorgung beantragt',
    summary: 'Der Stadtrat beantragt einen Investitionskredit von CHF 780’000, um die IT/OT-Systeme der Strom-, Gas- und Wassernetze an die IKT-Mindeststandards anzupassen. Darin enthalten sind CHF 443’400 für externe Cybersicherheitsleistungen und CHF 150’000 für eine externe Projektleitung. Drei Phasen sind von Oktober 2026 bis November 2027 vorgesehen.',
    why: 'Bedarf, Finanzierung und Zeitplan sind dokumentiert. Die Vorlage sieht externe Fachbegleitung vor, nennt aber keinen Anbieter. Deshalb sollten Cybersicherheit, Governance, Daten, Schnittstellen und Nachvollziehbarkeit zeitnah geklärt werden. Das Dokument belegt weder eine offene Ausschreibung noch, dass Prime unmittelbar teilnehmen kann.',
    tags: ['Cybersicherheit', 'Versorgungsbetriebe', 'IT/OT', 'Governance', 'Kredit beantragt', 'Abzuklären']
  },
  'gland-sit-qgis-cartolacote-2026': {
    title: 'CHF 164’600 für die Modernisierung des Geoinformationssystems bewilligt',
    summary: 'Der Gemeinderat hat einen Kredit von CHF 164’600 bewilligt, um das Geoinformationssystem zu modernisieren, von GeoConcept auf QGIS zu migrieren und die Einführung mit Cartolacôte fortzusetzen. Betroffen sind unter anderem Raumplanung, Infrastruktur, Wasser, Baustellen und Umwelt sowie mobile Anwendungen im Feld.',
    why: 'Der Beschluss belegt weder einen ERP-Wechsel noch einen offenen Auftrag für Prime. Er dokumentiert aber ein laufendes Vorhaben zu Daten über Abteilungsgrenzen hinweg, Interoperabilität, mobiler Nutzung und digitalem Wandel. Da Gland Prime-Kundin ist, muss der genaue kommerzielle Status intern abgeklärt werden.',
    tags: ['GIS', 'QGIS', 'Geodaten', 'Interoperabilität', 'Prime-Kundin', 'Intern abzuklären']
  },
  'biel-ia-partenariat-2026': {
    title: 'Biel/Bienne sucht einen langfristigen KI-Partner',
    summary: 'Die Stadt Biel/Bienne hat ein offenes Verfahren für einen Technologie- und Umsetzungspartner in den Bereichen künstliche Intelligenz, Datenmanagement und Informationssysteme publiziert. Das erste Projekt betrifft eine KI-gestützte Suche nach öffentlichen Informationen. Weitere Anwendungsfälle, Assistenten und Automatisierungen sind vorgesehen. Die Vertragsdauer beträgt fünf Jahre mit einer Verlängerungsoption um zwei Jahre.',
    why: 'Es handelt sich um einen konkreten kommunalen Digitalbedarf, der bereits ausgeschrieben ist und eine dauerhafte Partnerschaft anstrebt. Die Quelle belegt weder einen ERP-Bedarf noch eine direkte Teilnahmeberechtigung von Prime. Anforderungen, eine mögliche Rolle als Partner oder Subunternehmer und die strategische Bedeutung müssen rasch geklärt werden.',
    tags: ['KI', 'Daten', 'Informationssysteme', 'Offene Ausschreibung', 'Langfristige Partnerschaft', 'Abzuklären']
  },
  'meyrin-dechets-facturation-entreprises-2026': {
    title: 'Meyrin schreibt Sammlung und direkte Verrechnung von Betriebsabfällen aus',
    summary: 'Die Stadt Meyrin hat ein offenes Verfahren für eine Konzession zur Sammlung, zum Transport, zur Entsorgung und zur Verrechnung von brennbaren Siedlungsabfällen von rund 400 Betrieben ausgeschrieben. Das Volumen beträgt etwa 1’140 Tonnen pro Jahr. Der Konzessionär stellt den Betrieben die Leistungen nach den im Auftrag festgelegten Tarifen direkt in Rechnung. Der Vertrag ist auf vier Jahre mit einer einjährigen Option angelegt.',
    why: 'Das Verfahren dokumentiert ein kommunales Modell der direkten Verrechnung an Betriebe und berührt Debitorendaten, Schnittstellen und Fakturierung. Es ist jedoch keine Softwarebeschaffung: Die Verrechnung gehört zur Abfallkonzession. Das Signal ist daher zu beobachten, aber nicht automatisch als Verkaufschance zu qualifizieren.',
    tags: ['Abfälle', 'Direkte Verrechnung', 'Betriebe', 'Konzession', 'Schnittstellen', 'Beobachten']
  }
};

export const analysis = {
  'yverdon-sey-normes-tic-2026': {
    change: 'Aus einem allgemeinen Cybersicherheitsbedarf wird ein finanziertes, gestaffeltes Vorhaben mit ausdrücklich vorgesehenen externen Leistungen.',
    deduction: 'Die Abklärung kann vor der vollständigen Umsetzung des Kredits beginnen. Das Dokument erlaubt Fragen zu Umfang, Governance und Schnittstellen, belegt aber weder eine offene Ausschreibung noch die Teilnahmeberechtigung von Prime.',
    primeReading: 'Das Signal verdient eine interne Besprechung zu Versorgungsbetrieben, Daten und Integration. Die Quelle belegt weder ein Prime-Produkt noch eine kommerzielle Rolle.',
    nextAction: 'Intern klären, wer den Energiedienst kennt, und den Zeitplan der externen Leistungen prüfen.'
  },
  'monthey-strategie-numerique-2026': {
    change: 'Die Digitalstrategie ist keine abstrakte Absicht mehr: In der kommunalen Finanzplanung steht ein mehrjähriger Betrag.',
    deduction: 'Die Finanzierung macht mehrere digitale Vorhaben wahrscheinlich. Das öffentliche Dokument nennt aber weder deren genaue Inhalte noch Beschaffungswege oder Anbieter.',
    primeReading: 'Ein ERP-Wechsel darf nicht unterstellt werden. Zunächst sind Teilprojekte, Zuständigkeiten, Zeitplan und noch offene Themen zu bestimmen.',
    nextAction: 'Öffentliche oder persönliche Informationen zur Digitalstrategie einholen und vergebene Vorhaben von offenen Bedürfnissen trennen.'
  },
  'gland-sit-qgis-cartolacote-2026': {
    change: 'Das Geoinformationssystem tritt in eine beschlossene Modernisierungsphase mit Technologiewechsel sowie dokumentierten Anwendungen über Abteilungen hinweg und im Feld ein.',
    deduction: 'Das Vorhaben kann Bedarf an Schnittstellen oder angrenzenden Daten erzeugen. Die Quelle zeigt aber keinen weiteren offenen Auftrag über den beschriebenen GIS-Bereich hinaus.',
    primeReading: 'Gland ist Prime-Kundin. Das Signal bleibt sichtbar, der kommerzielle Stand muss jedoch vor jeder Aktion intern geprüft werden, damit keine bereits abgedeckte Arbeit erneut qualifiziert wird.',
    nextAction: 'Mit dem Prime-Team klären, ob Schnittstellen oder GIS-Daten bereits bekannt, offeriert oder abgedeckt sind.'
  },
  'biel-ia-partenariat-2026': {
    change: 'Biel/Bienne geht von einer allgemeinen KI-Absicht zu einem offenen Verfahren für einen dauerhaften Technologiepartner mit erstem Projekt und vorgesehenen weiteren Anwendungen über.',
    deduction: 'Die Beschaffung läuft bereits. Nun müssen Teilnahmebedingungen, verlangte Kompetenzen und eine mögliche Rolle von Partnern oder Subunternehmern rasch geprüft werden. Die Quelle nennt weder ERP noch ein gesuchtes Prime-Produkt.',
    primeReading: 'Für eine Stadt im Westschweizer Perimeter ist das strategisch relevant und betrifft Daten, Informationssysteme, Assistenten und Automatisierung. Prime darf nicht voraussetzen, allein anbieten zu können; eine interne und partnerschaftliche Klärung ist nötig.',
    nextAction: 'SIMAP-Kriterien lesen und vor der Eingabefrist klären, ob Prime direkt, im Konsortium oder als Subunternehmer mitwirken kann.'
  },
  'meyrin-dechets-facturation-entreprises-2026': {
    change: 'Meyrin verankert in einem offenen Verfahren die Auslagerung von Abfallsammlung und -behandlung samt direkter Verrechnung an die betroffenen Betriebe.',
    deduction: 'Das Dokument belegt ein operatives Modell direkter Verrechnung im kommunalen Abfallbereich. Es belegt weder ein separates Softwarelos noch ERP-Bedarf; die Verrechnungspflicht liegt beim Konzessionär.',
    primeReading: 'Das Signal dient vor allem als fachlicher Vergleich für Abfall- und Fakturierungsprojekte. Eine Chance für Prime entsteht nur, falls Schnittstellen, Debitorendaten oder Backoffice-Werkzeuge getrennt vergeben, unterbeauftragt oder kommunal integriert werden müssen.',
    nextAction: 'Kommunales System und vorgesehene Schnittstellen für Unternehmensdaten und Fakturierung abklären; die Konzession selbst nicht als Softwarechance von Prime behandeln.'
  }
};

export const stories = {
  'avenches-le-noirmont-prime': {
    kicker:'Eine Gemeinde, eine Geschichte · Nr. 1',
    standfirst:'Eine ehemalige römische Hauptstadt, das nationale Kompetenzzentrum für Pferde und ein Unternehmen aus den Freibergen: Ein Informatikprojekt erzählt manchmal weit mehr als eine Softwaregeschichte.',
    facts:[
      {dateLabel:'Vor über 2’000 Jahren',title:'Aventicum, Hauptstadt des helvetischen Gebiets',text:'Das Römermuseum Avenches beschreibt Aventicum als römische Hauptstadt des helvetischen Gebiets vor mehr als zwei Jahrtausenden.'},
      {dateLabel:'Seit 1898',title:'Avenches wird zum nationalen Zentrum für Pferde',text:'Das Schweizer Nationalgestüt wurde 1898 in Avenches gegründet. Agroscope bezeichnet es heute als Kompetenzzentrum des Bundes für Equiden.'},
      {dateLabel:'Heute',title:'Die Freiberger verbinden beide Regionen',text:'Zu den gesetzlichen Aufgaben des Gestüts gehört die Erhaltung der genetischen Vielfalt der Freiberger Pferderasse, zusammen mit dem ebenfalls in Avenches ansässigen Schweizer Zuchtverband.'}
    ],
    primeFact:{label:'Was Prime weiss',text:'Avenches ist als innosolvcity-Kundin mit Betreuung durch Prime erfasst. Laut Prime sind auch tebicom für die M-Files-Dokumentenverwaltung und AZ Informatique für das Hosting am Projekt beteiligt.',sourceLabel:'Prime-Communes-Datenbank + von Axel freigegebene Prime-Publikation',confidence:'intern bestätigt'},
    axelReading:{label:'Axels Einordnung',text:'Avenches bewahrt die Erinnerung an Helvetien und kümmert sich um das Freiberger Pferd. Prime entstand in Le Noirmont, mitten in der Region, die dieser Rasse ihren Namen gab. Diese Verbindung ist kein Werbekonstrukt: Das Erbe von Avenches und die Wurzeln von Prime treffen in diesem Projekt tatsächlich aufeinander.'},
    angles:[
      {label:'Zwei Regionen',title:'Von Aventicum in die Freiberge',text:'Zwei scheinbar weit entfernte Regionen begegnen sich durch ein lebendiges Schweizer Kulturerbe und ein gemeinsames Gemeindeprojekt.'},
      {label:'Jeder in seinem Fach',title:'Drei Fachgebiete, eine bessere Lösung',text:'Prime, tebicom und AZ versuchen nicht, alles selbst zu machen: Gemeindesoftware, Dokumentenverwaltung und Hosting greifen für die Gemeinde ineinander.'},
      {label:'Sinn der Arbeit',title:'Auch Software kann eine Geschichte weitertragen',text:'Technologie wird interessant, wenn sie Menschen, Fachwissen und Regionen verbindet, statt bloss ein Werkzeug zu ersetzen.'}
    ],
    deliverables:['Gemeindeporträt','LinkedIn-Beitrag','Einleitung einer Offerte','Kundenpräsentation']
  }
};
