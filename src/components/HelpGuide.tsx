import React from 'react';

interface HelpGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpGuide: React.FC<HelpGuideProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold">Hjälp & Användarguide</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
                        aria-label="Stäng"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4 text-sm">
                    <section>
                        <h4 className="font-semibold text-lg mb-2">Vad gör appen?</h4>
                        <p>
                            Den här appen hjälper dig att enkelt spara och hålla koll på dina utlägg.
                            Du kan lägga till, redigera och ta bort utlägg, och sedan skapa en rapport i PDF-format
                            när du behöver skicka in dina kostnader.
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Lägg till ett utlägg</h4>
                        <p>
                            Tryck på knappen för att lägga till ett nytt utlägg. Fyll i datum, summa och en kort beskrivning,
                            och tryck sedan på "Spara".
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Redigera eller ta bort</h4>
                        <p>
                            Hitta utlägget i listan nedan. Tryck på "Redigera" för att ändra uppgifterna,
                            eller "Ta bort" för att radera utlägget helt.
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Skapa och dela rapport</h4>
                        <p>
                            När du har lagt till alla dina utlägg kan du använda knapparna högst upp för att
                            skapa din rapport:
                        </p>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                            <li>
                                <strong>Dela rapport:</strong> Använd denna knapp för att direkt dela PDF:en via din enhets
                                delningsmeny. Detta fungerar bäst i Chrome på Android och på iPhone/iPad. Du kan då välja
                                att skicka via e-post, meddelandeapp eller annan delningsmetod.
                            </li>
                            <li>
                                <strong>Ladda ner PDF:</strong> Laddar ner rapporten som en PDF-fil till din enhet.
                                Du kan sedan bifoga filen i ett e-postmeddelande eller ladda upp den på annat sätt.
                            </li>
                        </ul>
                        <p className="mt-3">
                            <strong>Nästa steg:</strong> Efter att du skapat PDF:en, skicka den till kårens kassör för
                            hantering och utbetalning av dina utlägg.
                        </p>
                        <p className="mt-2 font-medium text-amber-700 dark:text-amber-400">
                            ⚠️ OBS! Efter att du har skapat och skickat in din rapport måste du själv klicka på
                            knappen "Rensa utlägg" för att ta bort alla utlägg från listan. Appen rensar inte
                            automatiskt dina utlägg.
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Inställningar</h4>
                        <p>
                            I inställningar (längre ner på sidan) kan du fylla i ditt namn och dina bankuppgifter.
                            Denna information behövs för att skapa rapporten. Du kan också anpassa andra val som
                            datumformat och valuta.
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Var sparas min information?</h4>
                        <p>
                            All information sparas lokalt i din webbläsare på din egen dator eller telefon.
                            Inget skickas till en server eller delas med någon annan. Det betyder:
                        </p>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                            <li>Dina uppgifter finns bara på den webbläsare och enhet där du använde appen.</li>
                            <li>Om du rensar webbläsarens data, byter webbläsare eller byter enhet kan informationen försvinna.</li>
                            <li>Du kan lita på att webbläsarens lagring klarar av att spara dina uppgifter under normal användning.</li>
                            <li>
                                Du kan använda appen även när du inte gör dina utlägg just nu – informationen finns kvar tills
                                du själv väljer att rensa den.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h4 className="font-semibold text-lg mb-2">Tips för säker användning</h4>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Använd samma webbläsare och samma enhet för att behålla dina uppgifter.</li>
                            <li>Kom ihåg att klicka "Rensa utlägg" efter att du skickat in din rapport.</li>
                        </ul>
                    </section>

                    <section className="mt-6 pt-4 border-t border-gray-300 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Om något känns oklart – öppna hjälp-knappen (?) när som helst för att se denna guide igen.
                        </p>
                    </section>
                </div>

                <div className="mt-6 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                        Stäng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpGuide;
