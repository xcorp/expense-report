import React from 'react';

interface MileageHelpGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const MileageHelpGuide: React.FC<MileageHelpGuideProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold">Hjälp: Milersättning vid körning med egen bil</h3>
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
                        <h4 className="font-semibold text-base mb-2">Vad är milersättning?</h4>
                        <p>
                            När du kör med din egen bil för kåren har du rätt till milersättning.
                            Det betyder att du får ersättning för varje kilometer du kör. Ersättningen
                            täcker kostnader för bensin, slitage på bilen och andra körkostnader.
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-base mb-2">Hur fungerar det i appen?</h4>
                        <p>
                            När du kryssar i "Körning med egen bil" behöver du fylla i:
                        </p>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                            <li><strong>Syfte med resan:</strong> Förklara varför du reste (t.ex. "Distriktsmöte" eller "Läger")</li>
                            <li><strong>Passagerare:</strong> Skriv namnen på eventuella passagerare som följde med</li>
                            <li><strong>Avstånd i kilometer:</strong> Hur många kilometer du körde</li>
                        </ul>
                    </section>

                    <section>
                        <h4 className="font-semibold text-base mb-2">Beräkna avståndet</h4>
                        <p>
                            Du har två sätt att ange avståndet:
                        </p>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                            <li>
                                <strong>Manuellt:</strong> Skriv in antalet kilometer direkt om du redan vet avståndet.
                            </li>
                            <li>
                                <strong>Ruttberäknare:</strong> Välj detta alternativ för att automatiskt beräkna avståndet.
                                Fyll i startplats och destination (du kan även lägga till mellanliggande stopp om du stannade
                                på flera platser). Appen beräknar sedan det totala avståndet åt dig.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h4 className="font-semibold text-base mb-2">Hur beräknas kostnaden?</h4>
                        <p>
                            Kostnaden beräknas automatiskt baserat på det avstånd du anger.
                            Appen multiplicerar antalet kilometer med en schablonersättning per kilometer.
                            Du behöver inte räkna ut kostnaden själv – det sköter appen!
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold text-base mb-2">Kvitto behövs inte</h4>
                        <p>
                            När du får milersättning behöver du inte bifoga något kvitto, eftersom ersättningen
                            baseras på ett schablonbelopp per kilometer. Däremot är det viktigt att du fyller i
                            korrekt information om resan.
                        </p>
                    </section>

                    <section className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <h4 className="font-semibold text-base mb-2">💡 Tips</h4>
                        <ul className="list-disc list-inside ml-2 space-y-1 text-sm">
                            <li>Använd ruttberäknaren om du är osäker på exakt avstånd</li>
                            <li>Kom ihåg att ange eventuella passagerare</li>
                            <li>Var tydlig med syftet så att den som hanterar din rapport förstår varför resan gjordes</li>
                        </ul>
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

export default MileageHelpGuide;
